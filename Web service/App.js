var express = require('express');
var app = express();
var http =  require('http');


var AWS = require('aws-sdk');
const glanguage = require('@google-cloud/language');
const cognitiveServices = require('cognitive-services');
const AYLIENTextAPI = require('aylien_textapi');
const credentials = require('./API_KEYS').API_KEYS;
const request = require('request');

/************************************************
Getting data for AWS Comprehend configuration
*************************************************/

var language="en";


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
const AzureNLP = new cognitiveServices.textAnalytics({
    apiKey: credentials.azure.azureFirstKey,
    endpoint: credentials.azure.azureEndpoint
});

/********************************************************

AYLIENT TEXT ANALYSIS SERVICE

*********************************************************/

var textapi = new AYLIENTextAPI({
  application_id: credentials.Aylien.appID,
  application_key: credentials.Aylien.appKey
});

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
        		respuesta.score=0;
        		respuesta.keyScores=[];
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
	const headers = {'Content-type': 'application/json'};
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
            respuesta.score=0;
            respuesta.keyScores=[];
            //azure let us to analize many documents at the same time, but now we are working with one
            var documentsSize=response.documents.length;
            var keyPhrasesAmount;
            var documentsData= response.documents;
            for (let i=0; i < documentsSize; i++)
            {
            	keyPhrasesAmount= documentsData[i].keyPhrases.length;
            	for (let j=0; j< keyPhrasesAmount ;j++)
            	{
            	respuesta.keyScores.push({
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
});

app.get('/aylienTextApi',function(req,res){
    textapi.entities(req.query.text, function(err, resp) {
  		if (err !== null) {
    		res.send(JSON.stringify({}));
  			} 
  		else 
  		{
  			//format response
            var respuesta={};
            respuesta.score=0;
            respuesta.keyScores=[];
            var limite=resp.entities.keyword!=null?resp.entities.keyword.length:0;
            var keyPhrases= resp.entities.keyword;
            for (let i=0; i< limite;i++){
            	respuesta.keyScores.push(
                	{
                        "key": keyPhrases[i],
                        "value": 0
                	});
            }
            res.send(JSON.stringify(respuesta));
    	}
	});
});
class TOKEN {
    constructor(pos, modifies, text, lemma, label, partOfSpeech){
        this.pos = pos;
        this.modifies = modifies;
        this.text = text;
        this.label = label;
        this.partOfSpeech = partOfSpeech;
        this.lemma = lemma;
        this.modifiers = [];
    }
    isPos(pos){
        return this.pos==pos;
    }
    itModifies(pos){
        return this.modifies==pos && this.pos!=pos;
    }
    text(){
        return this.text;
    }
    partOfSpeech(filter){
        if(!filter)
            return this.partOfSpeech;
        else
            return this.partOfSpeech[filter];
    }
    isRoot(){
        return this.label=='ROOT';
    }
    // addModifier(token){
    //     if(token.itModifies(this.pos)){
    //         this.modifiers.push(token);
    //         return true;
    //     }
    //     else{
    //         for(let x=0;this.modifiers[x]!=undefined;x++){
    //             if(this.modifiers[x].addModifier(token))
    //                 return true;
    //         }
    //         return false;
    //     }
    // }
    genTree(tokenList){
        for(let x = tokenList.length-1;x>=0;x--){
            if(tokenList[x].itModifies(this.pos)){
                let token = tokenList[x];
                tokenList.splice(x,1);
                this.modifiers.push(token);
            }
        }
        this.modifiers.forEach(modifier => {
            tokenList = modifier.genTree(tokenList);
        });
        return tokenList;
    }
    cleanUp(){
        this.modifies= undefined;
        this.modifiers.forEach(modifier => {
            modifier.cleanUp();
        });
        if (this.modifiers.length==0)
            this.modifiers=undefined;
    }
    print(tab){
        console.log(`${'-'.repeat(tab)}${this.text}-${this.label}`);
        if(this.modifiers!=undefined)
            this.modifiers.forEach(modifier =>{
                modifier.print(tab+1);
            });
    }
}

class SENTENCE {
    constructor(sentence, root){
        this.sentence = sentence;
        this.root = root;
    }
    print(){
        console.log(this.sentence)
        this.root.print(0);
    }
}
class PARAGRAPH {
    constructor(sentences, tokens){
        this.tokens = [];
        for(let x = 0; tokens[x]!=undefined;x++){
            let token = tokens[x];
            let partOfSpeech = {};
            Object.keys(token.partOfSpeech).forEach(key => {
                if (!token.partOfSpeech[key].includes('UNKNOWN'))
                    partOfSpeech[key] = token.partOfSpeech[key];
            });
            this.tokens.push(
                new TOKEN(
                    x,
                    token.dependencyEdge.headTokenIndex,
                    token.text.content,
                    token.lemma,
                    token.dependencyEdge.label,
                    partOfSpeech));
        }
        this.sentences = [];
        this.rootList = [];
        this.tokens.forEach(token =>{
            if(token.isRoot()){
                this.rootList.push(token);
            }
        });
        this.rootList.forEach(root =>{
            this.tokens = root.genTree(this.tokens);
            root.cleanUp();
            this.sentences.push(new SENTENCE(sentences[this.sentences.length].text.content,root));
        });
        this.sentences.forEach(sentence =>{
            sentence.print();
        });
    }
}
app.get('/googleTree',function(req,res){
  const document = {
    content: req.query.text,
    type: 'PLAIN_TEXT',
  };
    GoogleNLP
    .analyzeSyntax({document: document})
    .then(results => {
        res.send(new PARAGRAPH(results[0].sentences,results[0].tokens).sentences);
    })
    .catch(err => {
        console.log(err);
        res.send(JSON.stringify(err));
    });
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
            var respuesta= {};
            respuesta.score = 0;
            respuesta.keyScores = [];
            for(let x = 0; sentiment[x]!=null; x++){
            respuesta.keyScores.push({key: sentiment[x].name, value:sentiment[x].sentiment.score});
            }
            GoogleNLP
            .analyzeSentiment({document: document})
            .then(results => {
                const sentiment = results[0].documentSentiment;
                respuesta.score = sentiment.score;
                res.send(respuesta);
                });
        })
        .catch(err => {
            console.error('ERROR:', err);
    });
});

app.get('/IBMWatson', function(req,res){
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
          var watsy = JSON.parse(body);
          var respuesta= {};
          respuesta.score = watsy.sentiment.document.score;
          respuesta.keyScores = [];
          for (let x=0;watsy.keywords[x]!=undefined;x++){
            respuesta.keyScores.push({
              key: watsy.keywords[x].text,
              value: watsy.keywords[x].sentiment.score});
          }
          res.send(JSON.stringify(respuesta));
      }
      else{
          res.send(JSON.stringify({score:0, keyScores:[]}));
      }
  }
  request(options, callback);
});

var server = app.listen(8081, function ()
{
	var host = server.address().address;
    var port = server.address().port;
    console.log("Listen at %s:%s", host, port);
});
