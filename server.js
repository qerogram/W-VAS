var express = require('express');
var app = express();


app.use('/assets',express.static(__dirname+'/assets'));

app.get('/', function (req, res) {
  res.sendFile(__dirname+"/index.html");
});

app.get('/list', function (req, res) {
  res.sendFile(__dirname+"/list.html");
});

app.get('/scanner', function (req, res) {
  res.sendFile(__dirname+"/scanner.html");
});

app.listen(3000, function () {
  console.log('Server Start');
});
