var express = require('express');
var app = express();
var Client = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
var http = require('http');

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
  res.sendFile(__dirname+"/list.html");
});

app.post('/web_list', function(req, res){
   Client.connect('mongodb://localhost:27017/wvas', function(error, db){
        if(error) console.log(error);
        else {
            var _cnt = 1
            var dbs = db.collection('client');
            dbs.count({}, function(err, cnt) {
                if(!err) _cnt = cnt;
            });
            
            
            dbs.find({}, {}).toArray(function(err, result) {
                if(err) throw err;
                for(var i = 0; result[i] != null; ++i)  {
                    var temp = 0;
                    for(var j = 0; j<10; ++j) if(result[i]['result'][j]!=0) temp+=1;
                    result[i]['count'] = temp;
                }
                res.send({infor : result});
            });

            db.close();
        }
    }); 
});

app.get('/visit_count', function(req, res) {
    Client.connect('mongodb://localhost:27017/wvas', function(error, db){
        if(error) console.log(error);
        else {
            var query = {type:'count', name:"visit"};
            var cursor = db.collection('server').find(query);
            cursor.each(function(err,doc){
                if(!err) {
                    if(doc != null){
                        res.send({result:true, visit_count:doc['value']});
                    }
                }
            });
            db.close();
        }
    });
});

p = "";

 
function handleResponse(response) {
  var serverData = '';
  response.on('data', function (chunk) {
    serverData += chunk;
  });
  response.on('end', function () {
      if(serverData.indexOf("Index of") == -1) p = 1;
      else p = 0;
  });
}
 


app.post('/req_scan', function (req, res) {
    var ip = req.body.ip;
    var re = /\d{1,3}[.]\d{1,3}[.]\d{1,3}[.]\d{1,3}/;
    if(re.test(ip) && ip.length <= 16) {
        var options = {
            hostname: ip,
            port: 80,
            path: '/'
        };
        
        
        http.request(options, function(response){
            handleResponse(response);
            Client.connect('mongodb://localhost:27017/wvas', function(error, db) {
                if(error) console.log(error);
                else {
                    var query = {ip:ip, grade:"A", result:[p,0,0,0,0,0,0,0,0,0], date:Date.now(), count : 0};
                    db.collection('client').update({ip:ip},query, { upsert: true }, function(err, result) {
                        console.log(result['result']);
                    });

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

app.listen(8080, function () {
  console.log('Server Start');
});
