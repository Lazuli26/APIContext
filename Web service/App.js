var express = require('express');
var app = express();
var http =  require('http');


var AWS = require('aws-sdk');
const glanguage = require('@google-cloud/language');
const cognitiveServices = require('cognitive-services');
const AYLIENTextAPI = require('aylien_textapi');
const credentials = require('./API_KEYS').API_KEYS;
const request = require('request');

/**************************
	For read or write files
***************************/

const fs = require('fs');
var synonyms;


const interviewLanguage= require('./LanguageData/English_SyntaxData').DATA; 

/************************************************
Getting data for AWS Comprehend configuration
*************************************************/

var language="en";


var readSynonymsFile = function (filePath,callback){
	fs.readFile(filePath, (err, data) => {  
    if (err){
    	return {};
    } 
    else{
    	console.log(JSON.parse(data));

    	callback(JSON.parse(data));
    	//return JSON.parse(data);
    }
    
	});

}


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


/*********************************************************

	FOR STRING SIMILARITY

*********************************************************/
var stringSimilarity = require('string-similarity');

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

	constructor(sentence){

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


class listManager{
	constructor()
	{

	}

	searchWordInList(list,word){
		var limit= list.length;
		for(let i=0; i <limit; i++){
			if (list[i]=== word){
				return true;
			}
		}
		return false;
	}

}


/******************************
Todavía se puede mejorar que se elimine la lista de sinonimos cuando se encuentra una keyword, para eliminar los sinónimos asociados a esa keyword,
podrían tenerse un contador de palabras clave asociadas a la lista para conocer si se debe eliminar la lista de sinónimos
******************************/
class AnswerChecker {

	constructor(question,answer,checkerLanguage){
		this.question=question;
		this.answer= answer;

		this.checkerLanguage= checkerLanguage;
		this.keyWords= question.getKeyWords();
		this.totalPoints=this.keyWords.length;
		this.validSentence=0;
		this.synonymsList= question.getAllRelatedWords();
		this.listManager = new listManager();
		this.gottenPoints= this.analyzeSentence(this.synonymsList,this.answer);
		this.correctFactor=0.70;

	}


	textFormating(text){
		return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
	}

	fullSynonymsComparison(list, word){
		var limit= list.length;

		for(let i=0; i <limit; i++){
			
			if (stringSimilarity.compareTwoStrings(list[i],word) >= 0.8 ){
				return true;
			}
		}
		return false;

	}

	compareWithSynonyms(word){
		var limit= this.synonymsList.length;
		word= this.textFormating(word);
		for(let i=0; i < limit; i++){

			if (this.fullSynonymsComparison (this.synonymsList[i].list,word)) { //if the word is in the synonyms list at position i
				this.synonymsList[i].keysAmount-=1;

				if (this.synonymsList[i].keysAmount===0){
					this.synonymsList.splice(i,1);
				}
				//we can make a more powerful comparation for the word and the synoyms list, use a library

				return 1;
			}
		}

		return 0;

	}


	analyzeModifiers(modifiers){
		
		var limit= modifiers.length;
		var score=0;
		for(let i=0; i < limit; i++)
		{
			if (this.synonymsList.length===0){
				break;
			}

			score += this.analyzeTokens(modifiers[i]);
		}
		return score;
	}

	analyzeTokens(token){
		var score=0;
		
		if (this.synonymsList.length ===0){
			return 0;
		}

		if ((token.partOfSpeech.tag===this.checkerLanguage.verb && token.label != this.checkerLanguage.auxiliar) 
			|| token.partOfSpeech.tag=== this.checkerLanguage.noun ){

			score = this.compareWithSynonyms(token.text);

		}
		
		if (token.hasOwnProperty("modifiers") && token.modifiers!= undefined){
			score += this.analyzeModifiers(token.modifiers);
		}

		return score;
	}

	analyzeSentence(synonymsList,answer){
		var score=0;
		var data= answer.getData();
		var limit= data.length; //get the sentences amounts
		for (let i=0; i < limit; i++) {
			if (data[i].valid===this.validSentence ){ //if the sentences has a valid format 
				score += this.analyzeTokens(data[i].root);
			}
			if (i+1=== limit){

				return score;
			}
		}
		
	}

	isCorrectAnswer(){

		if ((this.totalPoints * this.correctFactor) <= this.gottenPoints){
			return true;
		}

		else if (Math.abs((this.totalPoints * this.correctFactor) - this.gottenPoints) < 0.4 ){
			return true

		}

		else{
			return false;
		}
	}
}

class Answer{

	
	/******************************************************
	Data: set of sentences, per sentence have a list of tokens
	*******************************************************/
	constructor(questionIdentification, identification,data){

		this.identification= identification;
		this.questionIdentification= questionIdentification;
		this.data= data; 
	}

	getData(){
		return this.data;
	}

}

class Question{

	constructor (identification, topic, text,keyWords,synonymsData){
		this.identification= identification;
		this.topic= topic;
		this.text= text;
		this.keyWords= keyWords;
		this.listManager = new listManager();
		this.allRelatedWords= this.getSynonymsList(keyWords,synonymsData);
		

	}

	

	searchInSynonymsList(synonymsList,word){
		
		var limit= synonymsList.length;
		for (let i=0; i < limit; i++){
			
			if (this.listManager.searchWordInList(synonymsList[i].list,word)){
				//add one key that is making a reference for that synonyms
				synonymsList[i].keysAmount +=1;
				return true;
			}
		}
		return false;
	}

	getSynonymsList(keyWords,synonymsData){
		var synonymsList=[];
		var limit= keyWords.length;
		for (let i=0; i < limit; i++){
			//append synonym list for list 
			//si dos palabras clave son SINONIMOS, HABRÍA QUE IR A VALIDARLO.
			if (this.searchInSynonymsList(synonymsList,keyWords[i].text)=== false ){
				synonymsList.push(this.getSynonimsForKey(keyWords[i],synonymsData));
			}
			
		}

		return synonymsList;

	}

	getSynonimsForKey(key,synonymsData){
		// by default is one key that is requiring that synonyms
		return {"list":synonymsData[key.synonymsIndex], "keysAmount": 1 };
	}

	getKeyWords(){
		return this.keyWords;
	}

	getAllRelatedWords(){
		return this.allRelatedWords;
	}

}

class PARAGRAPH {

    constructor(sentences, tokens){
    	this.sentencesValidation=[]; //have values for represent sentences valid state -1= válido, 0= válido

        this.tokens = [];
        var j=0;

        this.sentence= new sentenceChecker(sentences[j]);
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
            		
            		this.sentence= new sentenceChecker(sentences[j]);
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
    	question= new Question(1,"Object programing", "What is an object?",

		[ {"text":"Representation","synonymsIndex": "0"},{"text":"Reproduction","synonymsIndex": "0"},{"text":"Functions","synonymsIndex": "1"}],synonyms);
		var paragraph = new PARAGRAPH(results[0].sentences,results[0].tokens).sentences;
		var answer= new Answer(1,1,paragraph);
		var answerChecker= new AnswerChecker(question,answer, interviewLanguage);
		res.send(JSON.stringify({"AnswerData":{"TotalScore": answerChecker.totalPoints, "GottenScore": answerChecker.gottenPoints,
			"isCorrectAnswer": answerChecker.isCorrectAnswer()} ,"treeData": paragraph}));
        //res.send(new PARAGRAPH(results[0].sentences,results[0].tokens).sentences);
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

console.log("**************** Leyendo Archivo *******************");

readSynonymsFile('SynonymsData/Synonyms.json',function(data){
	synonyms= data;
	/*
	question= new Question(1,"Object programing", "What is an object?",
		[ {"text":"Representation","synonymsIndex": "0"},{"text":"Reproduction","synonymsIndex": "0"},{"text":"Functions","synonymsIndex": "1"}],synonyms);

	var a =
	[
    {
        "sentence": "We love Angular js, and we don't like React.",
        "root": {
            "pos": 1,
            "text": "love",
            "label": "ROOT",
            "partOfSpeech": {
                "tag": "VERB",
                "mood": "INDICATIVE",
                "number": "SINGULAR",
                "tense": "PRESENT"
            },
            "lemma": "love",
            "modifiers": [
                {
                    "pos": 11,
                    "text": ".",
                    "label": "P",
                    "partOfSpeech": {
                        "tag": "PUNCT"
                    },
                    "lemma": "."
                },
                {
                    "pos": 9,
                    "text": "like",
                    "label": "CONJ",
                    "partOfSpeech": {
                        "tag": "VERB"
                    },
                    "lemma": "like",
                    "modifiers": [
                        {
                            "pos": 10,
                            "text": "React",
                            "label": "DOBJ",
                            "partOfSpeech": {
                                "tag": "NOUN",
                                "number": "SINGULAR"
                            },
                            "lemma": "React"
                        },
                        {
                            "pos": 8,
                            "text": "n't",
                            "label": "NEG",
                            "partOfSpeech": {
                                "tag": "ADV"
                            },
                            "lemma": "n't"
                        },
                        {
                            "pos": 7,
                            "text": "do",
                            "label": "AUX",
                            "partOfSpeech": {
                                "tag": "VERB",
                                "mood": "INDICATIVE",
                                "tense": "PRESENT"
                            },
                            "lemma": "do"
                        },
                        {
                            "pos": 6,
                            "text": "we",
                            "label": "NSUBJ",
                            "partOfSpeech": {
                                "tag": "PRON",
                                "case": "NOMINATIVE",
                                "number": "PLURAL",
                                "person": "FIRST"
                            },
                            "lemma": "we"
                        }
                    ]
                },
                {
                    "pos": 5,
                    "text": "and",
                    "label": "CC",
                    "partOfSpeech": {
                        "tag": "CONJ"
                    },
                    "lemma": "and"
                },
                {
                    "pos": 4,
                    "text": ",",
                    "label": "P",
                    "partOfSpeech": {
                        "tag": "PUNCT"
                    },
                    "lemma": ","
                },
                {
                    "pos": 3,
                    "text": "js",
                    "label": "DOBJ",
                    "partOfSpeech": {
                        "tag": "NOUN",
                        "number": "PLURAL"
                    },
                    "lemma": "j",
                    "modifiers": [
                        {
                            "pos": 2,
                            "text": "Angular",
                            "label": "NN",
                            "partOfSpeech": {
                                "tag": "NOUN",
                                "number": "SINGULAR",
                                "proper": "PROPER"
                            },
                            "lemma": "Angular"
                        }
                    ]
                },
                {
                    "pos": 0,
                    "text": "We",
                    "label": "NSUBJ",
                    "partOfSpeech": {
                        "tag": "PRON",
                        "case": "NOMINATIVE",
                        "number": "PLURAL",
                        "person": "FIRST"
                    },
                    "lemma": "We"
                }
            ]
        },
        "valid": 0
    },
    {
        "sentence": "Use of time.",
        "root": {
            "pos": 12,
            "text": "Use",
            "label": "ROOT",
            "partOfSpeech": {
                "tag": "NOUN",
                "number": "SINGULAR"
            },
            "lemma": "Use",
            "modifiers": [
                {
                    "pos": 15,
                    "text": ".",
                    "label": "P",
                    "partOfSpeech": {
                        "tag": "PUNCT"
                    },
                    "lemma": "."
                },
                {
                    "pos": 13,
                    "text": "of",
                    "label": "PREP",
                    "partOfSpeech": {
                        "tag": "ADP"
                    },
                    "lemma": "of",
                    "modifiers": [
                        {
                            "pos": 14,
                            "text": "time",
                            "label": "POBJ",
                            "partOfSpeech": {
                                "tag": "NOUN",
                                "number": "SINGULAR"
                            },
                            "lemma": "time"
                        }
                    ]
                }
            ]
        },
        "valid": -1
    },
    {
        "sentence": "Angular is good.",
        "root": {
            "pos": 17,
            "text": "is",
            "label": "ROOT",
            "partOfSpeech": {
                "tag": "VERB",
                "mood": "INDICATIVE",
                "number": "SINGULAR",
                "person": "THIRD",
                "tense": "PRESENT"
            },
            "lemma": "be",
            "modifiers": [
                {
                    "pos": 19,
                    "text": ".",
                    "label": "P",
                    "partOfSpeech": {
                        "tag": "PUNCT"
                    },
                    "lemma": "."
                },
                {
                    "pos": 18,
                    "text": "good",
                    "label": "ACOMP",
                    "partOfSpeech": {
                        "tag": "ADJ"
                    },
                    "lemma": "good"
                },
                {
                    "pos": 16,
                    "text": "Angular",
                    "label": "NSUBJ",
                    "partOfSpeech": {
                        "tag": "NOUN",
                        "number": "SINGULAR",
                        "proper": "PROPER"
                    },
                    "lemma": "Angular"
                }
            ]
        },
        "valid": 0
    },
    {
        "sentence": "Ana is Juan.",
        "root": {
            "pos": 21,
            "text": "is",
            "label": "ROOT",
            "partOfSpeech": {
                "tag": "VERB",
                "mood": "INDICATIVE",
                "number": "SINGULAR",
                "person": "THIRD",
                "tense": "PRESENT"
            },
            "lemma": "be",
            "modifiers": [
                {
                    "pos": 23,
                    "text": ".",
                    "label": "P",
                    "partOfSpeech": {
                        "tag": "PUNCT"
                    },
                    "lemma": "."
                },
                {
                    "pos": 22,
                    "text": "Juan",
                    "label": "ATTR",
                    "partOfSpeech": {
                        "tag": "NOUN",
                        "number": "SINGULAR",
                        "proper": "PROPER"
                    },
                    "lemma": "Juan"
                },
                {
                    "pos": 20,
                    "text": "Ana",
                    "label": "NSUBJ",
                    "partOfSpeech": {
                        "tag": "NOUN",
                        "number": "SINGULAR",
                        "proper": "PROPER"
                    },
                    "lemma": "Ana"
                }
            ]
        },
        "valid": -1
    },
    {
        "sentence": "Ana's car.",
        "root": {
            "pos": 26,
            "text": "car",
            "label": "ROOT",
            "partOfSpeech": {
                "tag": "NOUN",
                "number": "SINGULAR"
            },
            "lemma": "car",
            "modifiers": [
                {
                    "pos": 27,
                    "text": ".",
                    "label": "P",
                    "partOfSpeech": {
                        "tag": "PUNCT"
                    },
                    "lemma": "."
                },
                {
                    "pos": 24,
                    "text": "Ana",
                    "label": "POSS",
                    "partOfSpeech": {
                        "tag": "NOUN",
                        "number": "SINGULAR",
                        "proper": "PROPER"
                    },
                    "lemma": "Ana",
                    "modifiers": [
                        {
                            "pos": 25,
                            "text": "'s",
                            "label": "PS",
                            "partOfSpeech": {
                                "tag": "PRT"
                            },
                            "lemma": "'s"
                        }
                    ]
                }
            ]
        },
        "valid": -1
    }
]

	var answer= new Answer(1,1,a);
	new AnswerChecker(question,answer, interviewLanguage);

	*/

});




var server = app.listen(8081, function ()
{
	var host = server.address().address;
    var port = server.address().port;
    console.log("Listen at %s:%s", host, port);
});

