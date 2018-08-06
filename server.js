var express = require('express');
var app = express();
var Client = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');
vuln = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

app.use('/assets',express.static(__dirname+'/assets'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extened:true}));

app.get('/', function (req, res) {
    Client.connect('mongodb://localhost:27017/wvas', function(error, db){
        if(error) console.log(error);
        else {
            var f_query = {type:'count', name:"visit"};
            var b_query = {$inc : {"value":1}};
            db.collection('server').updateOne(f_query, b_query);
            db.close();
        }
    });
  res.sendFile(__dirname+"/index.html");
});

app.get('/list', function (req, res) {
  var idx = req.query['idx'];
  if(isNaN(idx) == false && idx != "" && idx != " ") res.sendFile(__dirname+"/info.html");
  else res.sendFile(__dirname+"/list.html");
});

app.post('/web_list', function(req, res){
   Client.connect('mongodb://localhost:27017/wvas', function(error, db){
        if(error) console.log(error);
        else {
            db.collection('client').find({}, {}).toArray(function(err, result) {
                if(err) throw err;
                for(var i = 0; result[i] != null; ++i)  {
                    var total = 0;
                    for(var j = 0; j<10; ++j) if(result[i]['result'][j]!=0) total+=1;
                    result[i]['count'] = total;
                    
                    switch(total) {
                        case 0 : result[i]['grade']='A'; break;
                        case 1 :
                        case 2 :
                        case 3 : result[i]['grade']='B'; break;
                        case 4 :
                        case 5 : result[i]['grade']='C'; break;
                        case 6 : 
                        case 7 :
                        case 8 : result[i]['grade']='D'; break;
                        case 9 :
                        case 10 : result[i]['grade']='F'; break;
                    }
                }
                res.send({infor : result});
            });
            db.close();
        }
    });
});

app.get('/load_main', function(req, res) {
    Client.connect('mongodb://localhost:27017/wvas', function(error, db){
        if(error) console.log(error);
        else {
            var query = {type:'count', name:"visit"};
            var cursor = db.collection('server').find(query);
            var visit = 0;
            cursor.each(function(err,doc){
                if(!err) {
                    if(doc != null){
                        visit = doc['value'];
                    }
                }
            });
            db.collection('client').find({},{}).count(
                function(err, total) {
                    res.send({result:true, visit:visit, total:total});
                });
            db.close();
        }
        
    });
});

function handleResponse(response, keyword, idx) {
  var serverData = '';
  response.on('data', function (chunk) {
    serverData += chunk;
  });
  response.on('end', function () {
      if(serverData.indexOf(keyword) == -1) vuln[idx] = 1;
      else vuln[idx] = 0;
  });
}
 
app.post('/req_scan', function (req, res) {
    var ip = req.body.ip;
    var re = /^(1|2)?\d?\d([.](1|2)?\d?\d){3}$/;
    var ssl = req.body.ssl;
    if(req.body.type=='url') {
        re = /^(http\:\/\/)?((\w+)[.])+(asia|biz|cc|cn|com|de|eu|in|info|jobs|jp|kr|mobi|mx|name|net|nz|org|travel|tv|tw|uk|us)(\/(\w*))*$/i;
        if(ssl == 1) re = /^(https\:\/\/)?((\w+)[.])+(asia|biz|cc|cn|com|de|eu|in|info|jobs|jp|kr|mobi|mx|name|net|nz|org|travel|tv|tw|uk|us)(\/(\w*))*$/i;
    }
    ip = ip.replace(/(^\w+:|^)\/\//, '');
    if(re.test(ip)) {
        var options = {
            hostname: ip,
            port: 80,
            path: '/'
        };
        
        sw = http;
        
        if(ssl == 1) {
            options['port'] = 443;
            sw = https;
        }
        
        opt = options;
        opt.path = "/../../../../etc/passwd";
        
        sw.request(opt, function(response) {
            handleResponse(response, "../etc/passwd", 0);
            handleResponse(response, "Port", 2);
        }).end();
        
        sw.request(options, function(response){
            handleResponse(response, "Index of", 1);
            Client.connect('mongodb://localhost:27017/wvas', function(error, db) {
                if(error) console.log(error);
                else {
                    var query = {ip:ip, grade:"A", result:vuln, date:Date.now(), count : 0};
                    db.collection('client').update({ip:ip},query, { upsert: true }, function(err, result) { });
                    res.send({result:"success"})
                }
                db.close();
            });
        }).end();
    }
    else res.send({result:"fail"});
});

app.get('/scanner', function (req, res) {
  res.sendFile(__dirname+"/scanner.html");
});

app.get('/load_info', function(req, res) {
     Client.connect('mongodb://localhost:27017/wvas', function(error, db){
        if(error) console.log(error);
        else {         
            var url_count = 0;
            var ip_count = 0;
            db.collection('client').find({}, {}).toArray(function(err, result) {
                if(err) throw err;
                for(var i = 0; result[i] != null; ++i)  {
                    re = /^(http\:\/\/)?((\w+)[.])+(asia|biz|cc|cn|com|de|eu|in|info|jobs|jp|kr|mobi|mx|name|net|nz|org|travel|tv|tw|uk|us)(\/(\w*))*$/i;
                    if(re.test("http://"+result[i]['ip'])) url_count++;
                    else ip_count++;
                }
                total = url_count+ip_count;
                res.send({"url_count" : url_count, "ip_count" : ip_count, "total":total});
            });
            db.close();
        }
    }); 
});

app.get('/load_target_info', function(req, res) {
     Client.connect('mongodb://localhost:27017/wvas', function(error, db){
        if(error) console.log(error);
        else {         
            db.collection('client').find({}, {_id:0, grade:0, count:0}).skip(parseInt(req.query['idx'])-1).limit(1).toArray(function(err, result) {
                if(err) throw err;
                res.send({"addr" : result[0]['ip'], "res" : result[0]['result'], "date": result[0]['date']});
            });
            db.close();
        }
    }); 
});

app.listen(8080, function () {
  console.log('Server Start');
});
