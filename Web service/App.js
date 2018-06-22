var express = require('express');
var app = express();
var http =  require('http');


var AWS = require('aws-sdk');
const glanguage = require('@google-cloud/language');
const cognitiveServices = require('cognitive-services');
const AYLIENTextAPI = require('aylien_textapi');
const credentials = require('./API_KEYS').API_KEYS;
const request = require('request');

const interviewLanguage= require('./LanguageData/English_SyntaxData').DATA; 

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

/**********************************************************

GOOGLE CLOUD

**********************************************************/
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
	const headers = {
                'Content-type': 'application/json'};


    const body = {
                "documents": [
                    {
                        "language": language,
                        "id": 1,
                        "text": req.query.text
                    }
                ]

            }; 

   /* const body=	{
  				"language" : language,
  				"analyzerIds" : ["4fa79af1-f22c-408d-98bb-b7d7aeef7f04", 
    								"22a6b758-420f-4745-8a3c-46835a67c0d2", 
    								"08ea174b-bfdb-4e64-987e-602f85da7f72"],
  				"text" : req.query.text 
		};
    */

	AzureNLP.keyPhrases({headers,body})
		.then((response) => {

			res.send(JSON.stringify(response));
			 
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
        //console.log(`${'-'.repeat(tab)}${this.text}-${this.label}`);
        if(this.modifiers!=undefined)
            this.modifiers.forEach(modifier =>{
                modifier.print(tab+1);
            });
    }
}

class SENTENCE {
    constructor(sentence, root,valid){
        this.sentence = sentence;
        this.root = root;
        this.valid=valid;
    }
    print(){
        this.root.print(0);
    }

    
}

class sentenceChecker {

	constructor(sentence,nouns, verbs,others){

		this.syntaxData={
			nouns_prons:0,  //prons and nouns have the same meaning in that case
			verbs:0,
			others:0, //auxiliars, adv, attributes, etc
			validFormat: true //it doesn't depend of number of verbs and nouns.
		}

		this.wordsAmount= this.countWords(sentence.text.content);
	}

	countWords(sentence){
		return sentence.split(' ').length;
	}

	// special case for do and does when use n't do and does are auxiliar
	checkForAux(token,tokenList,index){
		console.log("index "+ index);
		console.log("text ** "+ token.text.content +"**");
		if (token.dependencyEdge.label != interviewLanguage.auxiliar){

			if (index < (tokenList.length-1) && tokenList[index+1].dependencyEdge.label != interviewLanguage.negation){
				this.syntaxData.verbs+=1;
				return;

			}
			
		}

		this.syntaxData.others++;
		
		
	}

	// special case for 's use. It has to be used with nouns or pron
	checkForPrt(tokenList,index){
		if (index>0){
			if (tokenList[index-1].partOfSpeech.tag != interviewLanguage.noun && tokenList[index-1].partOfSpeech.tag !=interviewLanguage.pron){
				this.syntaxData.validFormat= false;
			}
			else{
				this.syntaxData.others+=1;
			}
		}
	}

	updateValues(tokenList,index){

		if (tokenList[index].partOfSpeech.tag=== interviewLanguage.prt || tokenList[index].text.content=== interviewLanguage.prtText){
			this.checkForPrt(tokenList,index);
		}

		else if (tokenList[index].partOfSpeech.tag=== interviewLanguage.verb){
			this.checkForAux(tokenList[index],tokenList,index);
		}
		else if (tokenList[index].partOfSpeech.tag === interviewLanguage.noun || tokenList[index].partOfSpeech.tag=== interviewLanguage.pron){
			this.syntaxData.nouns_prons+=1;
		}
		else{
			if (tokenList[index].partOfSpeech.tag != interviewLanguage.point && tokenList[index].partOfSpeech.tag != interviewLanguage.prt
				&& tokenList[index].dependencyEdge.label!= interviewLanguage.negation)
			{
				this.syntaxData.others +=1;
			}
		}

	}

	isValid() {
		if (this.syntaxData.validFormat===false){
			return -1;
		}
		else if (this.syntaxData.verbs > 0 && this.syntaxData.nouns_prons > 0 &&  this.syntaxData.others >0){
			return 0;

		}
		else if (this.syntaxData.verbs===0){ //if the sentence doesn't have verbs
			if (this.syntaxData.nouns_prons > 0 &&  this.syntaxData.others >0){
				return 0;
			}
			else{
				return -1;
			}
		}
		else if (this.syntaxData.nouns_prons===0){
			return -1;
		}

		else if(this.syntaxData.others===0){
			return -1;
		}

		else{
			return -1;
		}
	}

}

class PARAGRAPH {

    constructor(sentences, tokens){
    	this.sentencesValidation=[]; //have values for represent sentences valid state -1= válido, 0= válido

        this.tokens = [];
        var j=0;

        this.sentence= new sentenceChecker(sentences[j],0,0,0);
        for(let x = 0; tokens[x]!=undefined;x++) {
            let token = tokens[x];
            let partOfSpeech = {};
            Object.keys(token.partOfSpeech).forEach(key => {
            	//incluir las part of speech que no contienen unknow en su valoe
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

            this.sentence.updateValues(tokens,x);

            console.log(JSON.stringify(this.sentence));
            console.log(token.text.content);
            //detect new sentence beginning
            if (token.text.content[0]==='.'){
            	j++;
            	this.sentencesValidation.push(this.sentence.isValid());
            	if ( j < sentences.length){
            		
            		this.sentence= new sentenceChecker(sentences[j],0,0,0);
            	}

            }
        }

        this.sentences = [];
        this.rootList = [];
        this.tokens.forEach(token =>{
            if(token.isRoot()){
                this.rootList.push(token);
            }
        });

        var i=0;
        this.rootList.forEach(root =>{

            this.tokens = root.genTree(this.tokens);
            root.cleanUp();
            this.sentences.push(new SENTENCE(sentences[this.sentences.length].text.content,root,this.sentencesValidation[i]));
            i++;
        });
        this.sentences.forEach(sentence =>{
            sentence.print();
        });
    }
}
app.get('/googleTree',function(req,res){
	console.log("petición escuhada");
	const document = {
    content: req.query.text,
    "language": "EN",
    type: 'PLAIN_TEXT',
  };
    GoogleNLP
    .analyzeSyntax({document: document})
    .then(results => {
    	//res.send(JSON.stringify(results))
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
    console.log(GoogleNLP);
    GoogleNLP
        .analyzeEntities({document: document})
        .then(results => {
            const sentiment = results[0].entities;
            res.send(results[0])
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
