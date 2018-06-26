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

/**********************************************************
	INSTANCE OF FILE MANAGER OBJECT
**********************************************************/
//const fileManager= new fileManager(fs,'QuestionsData/questions.json');

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
	INSTANCE OF GOOGLE API MANAGER OBJECT
**********************************************************/
//const googleApiManager= new GoogleApiManager(GoogleNLP);


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



class FileManager{
	constructor(fileStream, filePath){

		this.fileStream= fileStream;
		this.filePath= filePath;
		this.fileData={};

	}

	readFile(callback) {
		this.fileStream.readFile(this.filePath, (err, data) => {
    		if (err){
    			callback(false);
    		}

    		else
    		{ 
    			if (data.length ===0){

    				this.fileData={ "Questions": []
    								};
    			}
    			else{
    				this.fileData= JSON.parse(data);
    			} 

    			callback(true);
    		}	  
	});

	}

	writeInFile(callback){
		
		this.fileStream.writeFile(this.filePath, JSON.stringify(this.fileData), 'utf8', function(error){
	
			if (error){

				callback(false);
			}
			else{

				callback(true);

				}
		}); 

	}

	getQuestionsInMemory(){



		var limit = this.fileData.Questions.length;
		var questions = [];
		var questionData;

		for(let i=0; i < limit;i++){
			questionData={"QuestionID": this.fileData.Questions[i].questionID,
						  "QuestionText": this.fileData.Questions[i].text
						 }

			questions.push(questionData);
		}

		return questions;
	}

	getQuestionFromFile(callback){
		var that=this;
		this.readFile(function(response){

			if (response){
				callback(that.getQuestionsInMemory(),true);
			}
			else{
				callback([],false);
			}
		});
	}

}

class AnswersManager {
	
	constructor(googleApiManager){

		this.googleApiManager=googleApiManager;

	
	}


	addPoint(text){

		if (text[text.length-1] != '.'){
			text+= '.';
		}

		return text;
	}

	getEnvironment(){
		return this;
	}


	getTreeForAnswers (answers,index, answersTrees ,environment, callback) {

		console.log("\n iteracion numero: "+ index+ "\n");
		console.log(answers, index);
		if (index === answers.length){
			return callback(true,answersTrees);
		}

		else
		{

			answers[index]= environment.addPoint(answers[index]);
			environment.googleApiManager.setDocument( answers[index] ,'PLAIN_TEXT');
		  	
		  	var entities={};
		  	environment.googleApiManager.EntitiesSentiment(function(results, result){
		  		console.log(" result \n\n "+ result);
		  		if (result){

		        results[0].entities.forEach(entity => {
		         	entities[entity.name] = {
		            type: entity.type,
		            sentiment: entity.sentiment,
		            salience: entity.salience,
		            metadata: entity.metadata,
		            mentions: entity.mentions,
		            name: entity.name

		            }

		          });
		        console.log("Analyze syntax");
		        environment.googleApiManager.AnalyzeSyntax(function(syntaxData,result){
		        	console.log(" result analyze \n\n "+ result);
		        	if (result){


		        		var answerTree= new PARAGRAPH(syntaxData[0].sentences,syntaxData[0].tokens, entities).sentences;
		        		answersTrees.push(answerTree);  //for response data
		        		console.log(" Answer inserted \n\n");
		  		 		console.log(answerTree);
		        		//forWrite.answers.push(answerTree); 
		        		index+=1;

		        		environment.getTreeForAnswers(answers, index,answersTrees, environment ,callback);
		        		
		        	}
		        	else{
		        		
		        		return callback(false,[]);
		        	}

		  		  });

		    }

		    else{
		    	return callback(false,[]);
		    }

		        

		  	});
		}

	}

/*
	getTreesForAnswers (answers,forWrite,googleApiManager,answersTrees,callback) {
		 
		answers.forEach( answer =>{

			console.log("procesing answer...");
			console.log(answer);
		  	var entities= {};
		  	googleApiManager.setDocument(answer,'PLAIN_TEXT');
		  	
		  	googleApiManager.EntitiesSentiment(function(results, result){
		  		
		  		if (result){

		        results[0].entities.forEach(entity => {
		         	entities[entity.name] = {
		            type: entity.type,
		            sentiment: entity.sentiment,
		            salience: entity.salience,
		            metadata: entity.metadata,
		            mentions: entity.mentions,
		            name: entity.name

		            }
		          });

		        googleApiManager.AnalyzeSyntax(function(syntaxData,result){

		        	if (result){


		        		var answerTree= new PARAGRAPH(syntaxData[0].sentences,syntaxData[0].tokens, entities).sentences;
		        		answersTrees.push(answerTree);  //for response data
		        		console.log(" Answer inserted \n\n");
		  		 		console.log(answerTree);
		        		forWrite.answers.push(answerTree); 
		        		if (answersTrees.length === answers.length){
		        			return callback(true);
		        		}

		        	}
		        	else{
		        		return callback(false);
		        	}

		  		  });

		    }

		    else{
		    	return callback(false);
		    }

		        

		  	});
		  	

		  });

	}
*/

}


class GoogleApiManager {

	constructor(googleNLP){
		this.googleNLP= googleNLP;
		this.document=undefined;
	}

	setDocument(text,textType){
		this.document = {
    	content: text,
    	type: textType,
  		};
	}

	AnalyzeSyntax(callback){

		this.googleNLP.analyzeSyntax({document: this.document})
			.then(syntax => {
				callback(syntax,true);	
    			})

    		.catch(err => {
        		callback([], false);
   			 	});

	}

	EntitiesSentiment(callback){

		this.googleNLP.analyzeEntitySentiment({document: this.document})
        .then(results => {

        	callback(results,true);
        })
        .catch(e =>{

        	callback([], false);
        });
	}
}



class TOKEN {
    constructor(pos, modifies, text, lemma, label, partOfSpeech, entity){
        this.pos = pos;
        this.modifies = modifies;
        this.text = text;
        this.label = label;
        this.partOfSpeech = partOfSpeech;
        this.lemma = lemma;
        this.modifiers = [];
        this.entity = entity;
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
class MediumAnswerChecker {

	constructor(question,answer,checkerLanguage){
		this.question=question;
		this.answer= answer;

		this.checkerLanguage= checkerLanguage;
		this.keyWords= question.getKeyWords();
		this.totalPoints=this.keyWords.length;
		this.validSentence=0;
		this.synonymsList= question.getAllRelatedWords();

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
			console.log("Analizando oracion.....");
			if (data[i].valid===this.validSentence ){ //if the sentences has a valid format
				score += this.analyzeTokens(data[i].root);
			}
			
		}

		return score;

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
	Data: set of sentences, per sentence have a list of tokens and a valid propety 0= valid, 1= invalid
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

	constructor (identification, topic, level ,text,keyWords,synonymsData){
		this.identification= identification;
		this.topic= topic;
		this.text= text;
		this.level= level;
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
			//append to the synonyms list the synonyms
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
    constructor(sentences, tokens, entities){
    	this.sentencesValidation=[]; //have values for represent sentences valid state -1= válido, 0= válido
        this.tokens = [];

        Object.keys(entities).forEach(key =>{
          var entity = entities[key];
          for(let x = 0; x< entity.mentions.length; x++){
            let c = 0;
            console.log(entity.mentions[0])
            for(let y = 0; y < tokens.length && c < entity.mentions.length;y++){
              if (tokens[y].text.content == entity.name){
                c++;
                tokens[y].entity = {};
                tokens[y].entity.mention = {
                  text: entity.mentions[x].text.content,
                  type: entity.mentions[x].type,
                  magnitude: entity.mentions[x].sentiment.magnitude,
                  score: entity.mentions[x].sentiment.score
                }
                tokens[y].entity.type = entity.type;
                tokens[y].entity.magnitude = entity.magnitude;
                tokens[y].entity.score = entity.score;
                tokens[y].entity.salience = entity.salience;
                tokens[y].entity.metadata = entity.metadata;
                tokens[y].entity.name = entity.name;
                tokens[y].entity.sentiment = entity.sentiment;
              }
            }
          }
        })

        var j=0;

        this.sentence= new sentenceChecker(sentences[j]);
        for(let x = 0; tokens[x]!=undefined;x++){
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
                    partOfSpeech,
                    token.entity));
            this.sentence.updateValues(tokens,x);
            console.log(JSON.stringify(this.sentence));
            console.log(token.text.content);
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
    type: 'PLAIN_TEXT',
  };
    GoogleNLP
    .analyzeSyntax({document: document})

    .then(syntax => {
    	//res.send(JSON.stringify(results))
    	question= new Question(1,"Object programing", 0 ,"What is an object?",

		[ {"text":"Representation","synonymsIndex": "0"},{"text":"Reproduction","synonymsIndex": "0"},{"text":"Functions","synonymsIndex": "1"}],synonyms);

       GoogleNLP
      .analyzeEntitySentiment({document: document})
        .then(results => {
          var entities= {};
          results[0].entities.forEach(entity => {
            entities[entity.name] = {
              type: entity.type,
              sentiment: entity.sentiment,
              salience: entity.salience,
              metadata: entity.metadata,
              mentions: entity.mentions,
              name: entity.name
            }
          });

	    	var paragraph = new PARAGRAPH(syntax[0].sentences,syntax[0].tokens, entities).sentences;
			var answer= new Answer(1,1,paragraph);
			var answerChecker= new MediumAnswerChecker(question,answer, interviewLanguage);

          	res.send(JSON.stringify({"AnswerData":{"TotalScore": answerChecker.totalPoints, "GottenScore": answerChecker.gottenPoints,
				"isCorrectAnswer": answerChecker.isCorrectAnswer()} ,"treeData": paragraph}));
        })
        .catch(e =>{
        	var paragraph = new PARAGRAPH(syntax[0].sentences,syntax[0].tokens, {}).sentences;
			var answer= new Answer(1,1,paragraph);
			var answerChecker= new MediumAnswerChecker(question,answer, interviewLanguage);
        	res.send(JSON.stringify({"AnswerData":{"TotalScore": answerChecker.totalPoints, "GottenScore": answerChecker.gottenPoints,
			"isCorrectAnswer": answerChecker.isCorrectAnswer()} ,"treeData": paragraph}));
        });
    })

    .catch(err => {
        console.log(err);
        res.send(JSON.stringify(err));
    });
});

app.get('/googleEntities',function(req,res){
    const document = {
      content: req.query.text,
      type: 'PLAIN_TEXT',
    };
    // Detects the sentiment of the text
    GoogleNLP
        .analyzeEntitySentiment({document: document})
        .then(results => {
            const entities = results[0].entities;
            console.log(JSON.stringify(entities))
            var respuesta= {};
            entities.forEach(entity => {
              respuesta[entity.name] = {
                type: entity.type,
                sentiment: entity.sentiment,
                salience: entity.salience,
                metadata: entity.metadata,
                mentions: entity.mentions,
                name: entity.name
              }
            })
            res.send(respuesta);
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
	
});


app.get('/genQuestion', function(req,res) {
  
  console.log("atendiendo petición .........");

  req.query= JSON.parse(JSON.stringify(req.query));
  
  var googleApiManager = new GoogleApiManager(GoogleNLP);
  var fileManager = new FileManager(fs,'QuestionsData/questions.json');


  var answersTrees=[];
  var answers = JSON.parse(req.query.answers);



  console.log("answers  \n\n\n");
  console.log(answers);
  console.log("\n\n\n");


  var words = JSON.parse(req.query.words);
/*
  console.log("Words  \n\n\n");
  console.log(words);
  console.log("\n\n\n");
*/
  console.log(req.query);
  var forWrite={
  	"questionID": "",
  	"text": "",
  	"answers": [],
  	"keyWords":[]
  };
  
  var ansM= new AnswersManager(googleApiManager);

  fileManager.readFile(function(result){
  	if (result){

  

  		forWrite["questionID"]= fileManager.fileData.Questions.length;
  		forWrite["text"]= req.query.question;

  		ansM.getTreeForAnswers (answers, 0 ,answersTrees, ansM.getEnvironment() ,function(response,trees){
  			
  			if (response){

  				forWrite.answers= trees;
  				for( var key in words){
		  		forWrite.keyWords.push(words[key]);
		  		}	

		  		fileManager.fileData.Questions.push(forWrite);

		  		

				 fileManager.writeInFile(function(resp){

				 	if (resp){

				 		res.send(JSON.stringify({"success":true,"Questions": fileManager.getQuestionsInMemory()} ));
				 	}
				 	else{
				 		res.send(JSON.stringify({"success":false,"Questions": []} ));
				 	}
				 });
  			}

  			else{
  				res.send(JSON.stringify({"success":false,"Questions": []} ));
  			}

  		});
		 

  	}

  });
 
  
})


app.get('/getQuestions', function(req,res) {
	console.log("Atendiendo petición... ");
	var fileManager = new FileManager(fs,'QuestionsData/questions.json');
	fileManager.getQuestionFromFile(function(data, result){

		if (result){
			res.send(JSON.stringify({"success":true,"Questions": data} ));
		}
		else{
			res.send(JSON.stringify({"success":false,"Questions": data} ));
		}
	})

})




var server = app.listen(8081, function ()
{
	var host = server.address().address;
    var port = server.address().port;
    console.log("Listen at %s:%s", host, port);
});
