var express = require('express');
var app = express();
var Client = require('mongodb').MongoClient;
var bodyParser = require('body-parser');

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
            
            dbs.find({}, {_id:0, result:0, date:0}).toArray(function(err, result) {
                if(err) throw err;
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

app.post('/req_scan', function (req, res) {
    Client.connect('mongodb://localhost:27017/wvas',    function(error, db){
        if(error) console.log(error);
        else {
            var query = {ip:req.body.ip, count:0, grade:"A", result:[0,0,0,0,0,0,0,0,0,0], date:Date.now()};
            var cursor = db.collection('client').insert(query);
            db.close();
        }
    });
});

app.get('/scanner', function (req, res) {
  res.sendFile(__dirname+"/scanner.html");
});

app.listen(8080, function () {
  console.log('Server Start');
});
