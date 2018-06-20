/**
 * Date: 05-03-2018
 * Last update: 09-03-2018
 * @author: Julio Adán Montano Hernandez 
 * @summary: this is the server definitions for the othello emulator. 
*/

/*********************************************************
						IMPORTS
*********************************************************/
var express = require('express');
var app = express();
var http =  require('http');

/************************************************
Getting data for AWS Comprehend configuration
*************************************************/
var credentials = require('./API_KEYS');
var language="en";

/****************************************
 AWS Comprehend service import and configuration
******************************************/
var AWS = require('aws-sdk');
AWS.config = new AWS.Config();
AWS.config.accessKeyId = credentials.amazon.userID;
AWS.config.secretAccessKey = credentials.amazon.accessKey;
AWS.config.region = credentials.amazon.region;
var comprehend = new AWS.Comprehend({apiVersion: credentials.amazon.API_version});

/****************************************
 Azure text analysis service import and configuration
******************************************/
const cognitiveServices = require('cognitive-services');
const textAnalitics = new cognitiveServices.textAnalytics({
    apiKey: credentials.azure.azureFirstKey,
    endpoint: credentials.azure.azureEndpoint
})



app.use(function(req, res, next) 
{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "DELETE, GET, POST");
    next();
});


app.get('/amazonComprehendService',function(req,res){

	var params = {
                LanguageCode: language, 
                Text: req.query.text
            };

    comprehend.detectKeyPhrases(params, function(err, data) {
                if (err){ 
                		console.log(err, err.stack); // an error occurred}
                		res.end(JSON.stringify({"success": false,"data":[]}));
                	}
                else
                {     
                		console.log(data);           // successful response
                		res.end(JSON.stringify({"success": true,"data":data}));
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

    
	textAnalitics.keyPhrases({headers,body})
		.then((response) => {
			res.end(JSON.stringify({"success":true,"data": response}));
            })
		.catch((err) => {
			console.log(err);
			res.end(JSON.stringify({"success":false,"data": []}));
            }); 

	/*
	textAnalitics.sentiment({headers,body})
		.then((response) => {
			res.end(JSON.stringify({"success":true,"data": response}));
       		})
		.catch((err) => {
            console.log(err);
            res.end(JSON.stringify({"success":false,"data": []}));
            });
	*/

});


var server = app.listen(8081, function ()
{                        
	var host = server.address().address;
    var port = server.address().port;
    console.log("Esta corriendo en %s:%s", host, port);   
});








