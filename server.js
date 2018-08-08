var express = require('express');
var app = express();
var Client = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');
vuln = [0, 0, 0, 0, 0];

app.use('/assets',express.static(__dirname + '/assets'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extened : true}));

/* Start mainPage */
app.get('/', (req, res) => {
    Client.connect('mongodb://localhost:27017/wvas', (error, db) => {
        if(error) console.log(error);
        else {
            var f_query = {type : 'count', name : 'visit'};
            var b_query = {$inc : {'value' : 1}};
            db.collection('server').updateOne(f_query, b_query);
            db.close();
        }
    });
  res.sendFile(__dirname + '/index.html');
});

app.get('/load_info', (req, res) => {
     Client.connect('mongodb://localhost:27017/wvas', (error, db) => {
        if(error) console.log(error);
        else {         
            url_count = ip_count = 0;
            db.collection('client').find({}, {}).toArray((err, result) => {
                if(err) throw err;
                for(var i = 0; result[i] != null; ++i)  {
                    re = /^(http\:\/\/)?((\w+)[.])+(asia|biz|cc|cn|com|de|eu|in|info|jobs|jp|kr|mobi|mx|name|net|nz|org|travel|tv|tw|uk|us)(\/(\w*))*$/i;
                    if(re.test('http://'+result[i]['ip'])) url_count++;
                    else ip_count++;
                }
                total = url_count + ip_count;
                res.send({'url_count' : url_count, 'ip_count' : ip_count, 'total' : total});
            });
            db.close();
        }
    }); 
});

app.get('/load_main', (req, res) => {
    Client.connect('mongodb://localhost:27017/wvas', (error, db) => {
        if(error) console.log(error);
        else {
            var query = {type : 'count', name : 'visit'};
            visit = 0;
            db.collection('server').find(query).toArray((err, result) => visit = result[0]['value']);
            db.collection('client').find({},{}).count((err, total) => res.send({result : true, visit : visit, total : total}));
            db.close();
        }
    });
});
/* End mainPage */

/* Start listPage */
app.get('/list', (req, res) => {
  var idx = req.query['idx'];
  if(isNaN(idx) == false && idx != '' && idx != ' ') res.sendFile(__dirname + '/info.html');
  else res.sendFile(__dirname+'/list.html');
});

app.post('/web_list', (req, res) => {
   Client.connect('mongodb://localhost:27017/wvas', (error, db) => {
        if(error) console.log(error);
        else {
            db.collection('client').find({}, {}).toArray((err, result) => {
                if(err) throw err;
                for(var i = 0; result[i] != null; ++i)  {
                    var total = 0;
                    for(var j = 0; j < result[i]['result'].length; ++j) if(result[i]['result'][j] != 0) total += 1;
                    result[i]['count'] = total;
                    
                    switch(total) {
                        case 0 : result[i]['grade']='A'; break;
                        case 1 : result[i]['grade']='B'; break;
                        case 2 : result[i]['grade']='C'; break;
                        case 3 : result[i]['grade']='D'; break;
                        case 4 : 
                        case 5 : result[i]['grade']='F'; break; 
                    }
                }
                res.send({info : result});
            });
            db.close();
        }
    });
});

app.get('/load_target_info', (req, res) => {
     Client.connect('mongodb://localhost:27017/wvas', (error, db) => {
        if(error) console.log(error);
        else {         
            db.collection('client').find({}, {_id:0, grade:0, count:0}).skip(parseInt(req.query['idx'])-1).limit(1).toArray((err, result) => {
                if(err) throw err;
                res.send({'addr' : result[0]['ip'], 'res' : result[0]['result'], 'date': result[0]['date']});
            });
            db.close();
        }
    }); 
});
/* End listPage */

/* Start requestPage */
app.get('/scanner', (req, res) => res.sendFile(__dirname + '/scanner.html'));

const handleResponse = (response, keyword, idx, not) => {
  var serverData = '';
  response.on('data', chunk => serverData+=chunk);
  response.on('end', () => {
      if(not) {
          if(serverData.indexOf(keyword) == -1) vuln[idx] = 1;
          else vuln[idx] = 0;
      }
      else {
          if(serverData.indexOf(keyword) != -1) vuln[idx] = 1;
          else vuln[idx] = 0;
      }
  });
}
 
app.post('/Request', (req, res) => {
    var ip = req.body.ip;
    var re = /^(1|2)?\d?\d([.](1|2)?\d?\d){3}$/;
    ssl = result = false;
    
    if(req.body.type=='url') {
        re = /^(http\:\/\/)?((\w+)[.])+(asia|biz|cc|cn|com|de|eu|in|info|jobs|jp|kr|mobi|mx|name|net|nz|org|travel|tv|tw|uk|us)(\/(\w*))*$/i;
        if(!(result = re.test(ip))) {
            re = /^(https\:\/\/)?((\w+)[.])+(asia|biz|cc|cn|com|de|eu|in|info|jobs|jp|kr|mobi|mx|name|net|nz|org|travel|tv|tw|uk|us)(\/(\w*))*$/i;
            result = re.test(ip);
            ssl = result;
        }
    }
    
    ip = ip.replace(/(^\w+:|^)\/\//, '');
    
    if(result) {
        var options = {
            hostname : ip,
            port : 80,
            path : '/admin'
        };
        
        sw = http;
        
        if(ssl) {
            options['port'] = 443;
            sw = https;
        }

        sw.request(options, response => { if(response['statusCode'] == 200) vuln[3] = 1 }).end();
        
        options.path = '/../../../../etc/passwd';
        sw.request(options, response => { handleResponse(response, '../etc/passwd', 0, 0); handleResponse(response, 'Port', 2, 0); }).end();
        
        options.path = '/login';
        sw.request(options, response => handleResponse(response, 'maxlength', 4, 1)).end();
        
        options.path = '/';
        sw.request(options, response => {
            handleResponse(response, 'Index of', 1, 0);
            Client.connect('mongodb://localhost:27017/wvas', (error, db) => {
                if(error) console.log(error);
                else {
                    var query = {ip : ip, grade : "A", result : vuln, date : Date.now(), count : 0};
                    db.collection('client').update({ip : ip}, query, {upsert: true}, (err, result) => { });
                    res.send({result : 'success'})
                }
                db.close();
            });
        }).end();
    }
    else res.send({result : 'fail'});
});

/* End requestPage */

app.listen(8080, () => console.log('Server Start'));