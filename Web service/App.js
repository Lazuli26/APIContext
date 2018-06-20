var express = require('express');
var app = express();
var http =  require('http');
var AWS = require('aws-sdk');
const glanguage = require('@google-cloud/language');
var credentials = require('./API_KEYS').API_KEYS;

/****************************************
 AWS Comprehend service configuration
******************************************/
AWS.config = new AWS.Config();
AWS.config.accessKeyId = credentials.amazon.userID;
AWS.config.secretAccessKey = credentials.amazon.accessKey;
AWS.config.region = credentials.amazon.region;
var AmazonNLP = new AWS.Comprehend({apiVersion: credentials.amazon.API_version});

// Instancia de Google Natural Languaje Processing
const GoogleNLP = new glanguage.LanguageServiceClient();
app.use(function(req, res, next)
{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "DELETE, GET, POST");
    next();
});

app.get('/amazonComprehend',function(req,res){
	console.log("peticion entrante");
	var params = {
                LanguageCode: "en",
                Text: req.query.text
            };
    AmazonNLP.detectKeyPhrases(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else     console.log(data);           // successful response
                res.end(JSON.stringify({"data":data}));
            });
});
app.get('/googleLanguage',function(req,res){
	console.log("peticion entrante");
  const document = {
    content: req.query.text,
    type: 'PLAIN_TEXT',
  };

  // Detects the sentiment of the text
  GoogleNLP
    .analyzeSentiment({document: document})
    .then(results => {
      const sentiment = results[0].documentSentiment;
      console.log(`Text: ${text}`);
      console.log(`Sentiment score: ${sentiment.score}`);
      console.log(`Sentiment magnitude: ${sentiment.magnitude}`);
    })
    .catch(err => {
      console.error('ERROR:', err);
  });
});
app.get('/IBMWatson', function(req,res){
  var request = require('request');
  var headers = {
      'Content-Type': 'application/json'
  };
  var dataString = {
    "text": req.query.text,
    "features": {
      "sentiment": {},
      "keywords": {
        "sentiment": true
      }
    }
  };
  var options = {
      url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/v1/analyze?version=2017-02-27',
      method: 'POST',
      headers: headers,
      body: JSON.stringify(dataString),
      auth: {
          'user': 'bb64a147-f9f3-4579-85da-8f155815970f',
          'pass': 'PrtIjxa8sGTB'
      }
  };
  function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
          var watsy = JSON.parse(body)
          var respuesta= {}
          respuesta["score"] = watsy.sentiment.document.score;
          respuesta["keyWords"] = [];
          respuesta["keyScores"] = [];
          for (let x=0;watsy.keywords[x]!=undefined;x++){
            respuesta.keyWords.push(watsy.keywords[x].text);
            respuesta.keyScores.push({
              key: watsy.keywords[x].text,
              value: watsy.keywords[x].sentiment.score});
          }
          res.send(JSON.stringify(respuesta));
      }
  }
  request(options, callback);
})

var server = app.listen(8081, function ()
{
	var host = server.address().address;
    var port = server.address().port;
    console.log("Esta corriendo en %s:%s", host, port);
});
