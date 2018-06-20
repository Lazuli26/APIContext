var express = require('express');
var app = express();
var http =  require('http');


/************************************************
Getting data for AWS Comprehend configuration
*************************************************/

var language="en";

var AWS = require('aws-sdk');
// const glanguage = require('@google-cloud/language');
var credentials = require('./API_KEYS').API_KEYS;


/****************************************
 AWS Comprehend service configuration
******************************************/
AWS.config = new AWS.Config();
AWS.config.accessKeyId = credentials.amazon.userID;
AWS.config.secretAccessKey = credentials.amazon.accessKey;
AWS.config.region = credentials.amazon.region;
var AmazonNLP = new AWS.Comprehend({apiVersion: credentials.amazon.API_version});

/****************************************
 Azure text analysis service import and configuration
******************************************/
const cognitiveServices = require('cognitive-services');
const AzureNLP = new cognitiveServices.textAnalytics({
    apiKey: credentials.azure.azureFirstKey,
    endpoint: credentials.azure.azureEndpoint
});




// Instancia de Google Natural Languaje Processing
// const GoogleNLP = new glanguage.LanguageServiceClient();

app.use(function(req, res, next)

{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "DELETE, GET, POST");
    next();
});


app.get('/amazonComprehend',function(req,res){
	

	var params = {
                LanguageCode: "en",
                Text: req.query.text
            };


    AmazonNLP.detectKeyPhrases(params, function(err, data) {
                if (err){ 
                		console.log(err, err.stack); // an error occurred}
                		res.end(JSON.stringify({}));
                	}
                else
                {     
                		//format response
                		var respuesta={};
                		respuesta["score"]=0;
                		respuesta["keyScores"]=[];
                		var limite=data.KeyPhrases.length;
                		var keyPhrases= data.KeyPhrases;
                		

                		for (let i=0; i< limite;i++){
                			

                			respuesta.keyScores.push(
                				{
                					"key": keyPhrases[i].Text,
                					"value": keyPhrases[i].Score 

                				}
                			);
                		}

                		res.send(JSON.stringify(respuesta));

            	}

            });

});


app.get('/azureCognitiveService',function(req,res){

	const headers = {
                'Content-type': 'application/json'
            };

    const body = {
                "documents": [
                    {
                        "language": language,
                        "id": 1,
                        "text": req.query.text
                    }
                ]
            };

    
	AzureNLP.keyPhrases({headers,body})
		.then((response) => {
			
			//Format response
			var respuesta={};
            respuesta["score"]=0;
            respuesta["keyScores"]=[];

            //azure let us to analize many documents at the same time, but now we are working with one
            var documentsSize=response.documents.length;
            var keyPhrasesAmount;
            var documentsData= response.documents;
                		

            for (let i=0; i < documentsSize; i++)
            {
          
            	keyPhrasesAmount= documentsData[i].keyPhrases.length;

            	for (let j=0; j< keyPhrasesAmount ;j++)
            	{
            	respuesta.keyScores.push(
                	{
                		"key": documentsData[i].keyPhrases[j],
                		"value": 0  //azure doesn't return a level of confidence
                	}
                	);
            	}

        	}

            res.send(JSON.stringify(respuesta));
		

            })
		.catch((err) => {
			console.log(err);
			res.end(JSON.stringify({"success":false,"data": []}));
            }); 

	/*
	AzureNLP.sentiment({headers,body})
		.then((response) => {
			res.end(JSON.stringify({"success":true,"data": response}));
       		})
		.catch((err) => {
            console.log(err);
            res.end(JSON.stringify({"success":false,"data": []}));
            });
	*/

});

app.get('/googleLanguage',function(req,res){
  const document = {
    content: req.query.text,
    type: 'PLAIN_TEXT',
  };

  // Detects the sentiment of the text
  GoogleNLP
    .analyzeEntitySentiment({document: document})
    .then(results => {
      const sentiment = results[0].entities;
      var respuesta= {}
      respuesta["score"] = 0;
      respuesta["keyWords"] = [];
      respuesta["keyScores"] = [];
      for(let x = 0; sentiment[x]!=null; x++){
        respuesta.keyScores.push({key: sentiment[x].name, value:sentiment[x].sentiment.score})
      }
      GoogleNLP
        .analyzeSentiment({document: document})
        .then(results => {
          const sentiment = results[0].documentSentiment;
          respuesta.score = sentiment.score;
          res.send(respuesta)
        })
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
    console.log("Listen at %s:%s", host, port);
});

