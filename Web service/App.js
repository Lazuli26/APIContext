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
var credentials = require('../NLP_test  user Credentials/credentials');
var language="en";

/****************************************
 AWS Comprehend service import and configuration
******************************************/
var AWS = require('aws-sdk');
AWS.config = new AWS.Config();
AWS.config.accessKeyId = credentials.userID;
AWS.config.secretAccessKey = credentials.accessKey;
AWS.config.region = credentials.region;

var comprehend = new AWS.Comprehend({apiVersion: credentials.API_version});

app.use(function(req, res, next) 
{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "DELETE, GET, POST");
    next();
});


/** 
 * Allows registrate a user and return the id
 * @param {String} mail
 * @param {String} name 
 * @param {String} imageURL
 * @returns JSON
 * Checked
 */
app.get('/getPlayerId',function(req, res)
{    

    db.func('mg_get_player', [req.query.mail, req.query.name, req.query.imageURL])    
    .then(data => 
    {        	  
        res.end(JSON.stringify(data));
    })
    .catch(error=> 
    {    	    	  
        res.end(JSON.stringify(false));                
    })      
});


app.get('/amazonComprehend',function(req,res){
	console.log("peticion entrante");
	var params = {
                LanguageCode: language, 
                Text: req.query.text
            };

    comprehend.detectKeyPhrases(params, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else     console.log(data);           // successful response
                res.end(JSON.stringify({"data":data}));
            });

});



var server = app.listen(8081, function ()
{                        
	var host = server.address().address;
    var port = server.address().port;
    console.log("Esta corriendo en %s:%s", host, port);   
});







