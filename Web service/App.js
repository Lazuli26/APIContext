var express = require('express');
var app = express();
var http =  require('http');


/*********************************************************
	FOR STRING SIMILARITY
*********************************************************/
var stringSimilarity = require('string-similarity');
const glanguage = require('@google-cloud/language');
const request = require('request');

/**************************
	For read or write files
***************************/

const fs = require('fs');

/**********************************************************
	INSTANCE OF FILE MANAGER OBJECT
**********************************************************/
//const fileManager= new fileManager(fs,'QuestionsData/questions.json');

const interviewLanguage= require('./LanguageData/English_SyntaxData').DATA;

var language="en";

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

	getQuestionById(questionID,callback){
		var that= this;
		this.readFile(function(response){

			if (response){
				callback(that.fileData.Questions[questionID],true);
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


		if (index === answers.length){

			return callback(true,answersTrees);
		}

		else
		{

			answers[index]= environment.addPoint(answers[index]);
			environment.googleApiManager.setDocument( answers[index] ,'PLAIN_TEXT');

		  	var entities={};
		  	environment.googleApiManager.EntitiesSentiment(function(results, result){
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

		        environment.googleApiManager.AnalyzeSyntax(function(syntaxData,result){

		        	if (result){


		        		var answerTree= new PARAGRAPH(syntaxData[0].sentences,syntaxData[0].tokens, entities).sentences;
		        		answersTrees.push(answerTree);  //for response data

		        		index+=1;

		        		environment.getTreeForAnswers(answers, index,answersTrees, environment ,callback);

		        	}
		        	else{
								console.log(`Error, SyntaxData: ${syntaxData}`)
		        		return callback(false,[]);
		        	}

		  		  });
		    }

		    else {
					console.log('Sentiment Error')
		    	return callback(false,[]);
		    }
		  });
		}
	}
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
					console.log(err);
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
        this.visited=false;
    }

    isPos(pos){
        return this.pos==pos;
    }

    setVisited(value){
    	this.visited=value;
    }

    setEntity(isEntity){
    	this.entity=isEntity;
    }

    setModifiers(modifiers){
    	this.modifiers= modifiers;
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

	isEntity(entityList){
		
		if(this.entity !=undefined){
				return true;
			}

			for(var x in entityList){
				for (var y in entityList[x]){
					if (stringSimilarity.compareTwoStrings(this.lemma, entityList[x][y] )>= 0.75)
						return true;
				}
			}
			return false;
	}

	

	isEquivalent(token, entityList){
		
		if(stringSimilarity.compareTwoStrings(this.lemma, token.lemma ) >= 0.75 ){
			
			return true;
		}
		for(var x in entityList){
			let me = false;
			let him = false;
			for (var y in entityList[x]){
				
				if (stringSimilarity.compareTwoStrings(this.lemma, entityList[x][y] )>= 0.75)
					me= true;
				if (stringSimilarity.compareTwoStrings( token.lemma, entityList[x][y] )>= 0.75)
					him= true;
			}
			if(him && me){

				return true;
			}
			if((him && !me) || (!him && me)){

				return false;
			}
		}

		return false;
	}

	relevantModifiers() {

		let relevant = []
		for (var x in this.modifiers){
			let tag = this.modifiers[x].partOfSpeech.tag;
			if( tag === 'NOUN' || tag === 'VERB' || tag === 'ADJ'){
				relevant.push(this.modifiers[x]);

			}

		}

		return relevant;
	
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

	constructor(){

		this.syntaxData={
			nouns_prons:0,  //prons and nouns have the same meaning in that case
			verbs:0,
			others:0, //auxiliars, adv, attributes, etc
			validFormat: true //it doesn't depend of number of verbs and nouns.
		}

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


class TreeAnalyzer {

	constructor() {
		this.validSentence=0;
		this.entityList=[];
	}

	searchEntityInAnswer (entityToken, userAnswer,entities) {
		this.entityList=entities;
		var limit= userAnswer.length; //get the sentences amounts
		//console.log("\n \n "+ "Buscando entidad en respuesta" +"\n \n");
		var resultToken;
		var entityAppearances=[];
		for (let i=0; i < limit; i++) {

			if (userAnswer[i].valid===this.validSentence ){ //if the sentences has a valid format 

				//console.log("iniciando análsis de tokens \n \n ");
				entityAppearances=this.analyzeTokens(userAnswer[i].root,entityToken,entityAppearances);

			}
			
		}

		return entityAppearances;

	}

	
	analyzeModifiers(modifiers,answerToken,entityAppearances) {

		var limit= modifiers.length;
		var resultToken= undefined;
		for(let i=0; i < limit; i++)
		{
			entityAppearances = this.analyzeTokens(modifiers[i] , answerToken, entityAppearances);

		}

		return entityAppearances;

	}

	
	analyzeTokens(currentToken,answerToken, entityAppearances){

		if ( currentToken.isEquivalent( answerToken , this.entityList) ){


			entityAppearances.push(currentToken);
		}
		
		if (currentToken.hasOwnProperty("modifiers") && currentToken.modifiers!= undefined){
			entityAppearances =this.analyzeModifiers(currentToken.modifiers,answerToken, entityAppearances);
		}

		return entityAppearances;

	}

}

/*
 Then modify that class for make it able to control the ase in when a keyword appears many times, 
 because it could alter counters for answer entities and others
*/
class AnswersComparator {

	constructor(answers, answer, entities) {
		this.answers=answers;
		this.userAnswer= answer;
		this.coincidenceWithAnswers=[];
		this.treeAnalyzer= new TreeAnalyzer();
		this.coincidenceFactor= 0.65 ;
		this.entityList= entities;
		this.entities=0;
		//console.log("\n Lista de entidades \n ");
		//console.log(this.entityList);

	}

	/*
	FORGIVE: specify that tokens are similar if the total tags is greater than coincidences only by an unit
	*/
	compareTokensPartOFSpeech(answerToken, userAnswerToken,forgive){
		var totalTags=0;
		var coincidences=0;
		for (var element in answerToken.partOfSpeech){
			totalTags +=1;
			if (userAnswerToken.partOfSpeech.hasOwnProperty(element)){
				if ( answerToken.partOfSpeech[element] === userAnswerToken.partOfSpeech[element]){
					coincidences+=1;
				}
			}
		}

		if (forgive === true && coincidences < totalTags){
			coincidences+=1;
		}

		return coincidences/ totalTags;

	}

	
	getSimilarTokenInModifiers(token, modifiers,entityList){

			var limit=modifiers.length;
			var tempObject;
			for (let i =0; i < limit; i++){
				modifiers[i] = this.generateNewToken(modifiers[i]);
				if (modifiers[i].isEquivalent(token, entityList) ){
					return modifiers[i];
				}
			}
			return undefined;
		}


	// return an score that set how similar are both token modifiers,, based on tokenOneModifiers
	getTokensModifiersCoincidenceDegree(tokenOneModifiers,expectedModifiers){
			
		if ( expectedModifiers.length === 0 ) {

			return 1; //100% coincidence degree
		}

		if (tokenOneModifiers.length===0){
			return 0; // 0% coincidence degree
		}

		var limit= tokenOneModifiers.length;
		var coincidences=0;
		var tempToken;
		var coincidenceValue;
		for (let i=0; i < limit; i++ ){

			tempToken= this.getSimilarTokenInModifiers(tokenOneModifiers[i] , expectedModifiers , this.entityList);

			if (tempToken != undefined ){

					coincidenceValue = this.compareTokensPartOFSpeech(tempToken,tokenOneModifiers[i], false);
					if (coincidenceValue  >=  this.coincidenceFactor ){
						coincidences++;
					}

			}
		}

		return coincidences / expectedModifiers.length;


	}

	getEquivalentPercentage(realPercentage, coincidenceDegree){
		if (coincidenceDegree>= this.coincidenceFactor){
			return realPercentage/100;
		}

		else{
			return (Math.round(realPercentage*coincidenceDegree))/100;
		}
	}

	

	/*
	analyze entity appearances in user answer
	return an int value that set what is the appearances that is closer to the coincidenceFactor
	*/
	AnalyzeEntityAppearances(answerToken, appearancesList){
		var limit= appearancesList.length;
		var greaterCoincidenceDegree=0;


		var tokenResModifiers;
		var parentsPartOfSpeechCoincidence;
		var tokenModifiers= answerToken.relevantModifiers();

		console.log("cantidad de modifiers: "+ tokenModifiers.length+" \n");

		var modifierComparisonCoincidence;
		var parentsPartOfSpeechWeight;
		var modifiersCoincidenceWeight;
		var coincidenceDegree=0;

		console.log("aswer token text: "+ answerToken.text);


		for (let i=0; i < limit; i++){
		//compare part of speech
			parentsPartOfSpeechCoincidence = this.compareTokensPartOFSpeech(answerToken,appearancesList[i],true);
			
			console.log("\n appearancesList at postion: "+ i+ " -- text: "+ appearancesList[i] +"\n");
			console.log("Similitud entre padres (partOfSpeech): "+ parentsPartOfSpeechCoincidence+"\n");
			// get relevant modifiers of token ah the position i

			tokenResModifiers = appearancesList[i].relevantModifiers();

			// compare token's modifiers of user answer token and store answer token
			modifierComparisonCoincidence = this.getTokensModifiersCoincidenceDegree(tokenResModifiers, tokenModifiers);

			console.log("Similitud entre modifiers (partOfSpeech, others): "+ modifierComparisonCoincidence  +"\n");

			parentsPartOfSpeechWeight= 100- ((100 /(tokenModifiers.length+2))* tokenModifiers.length);

			console.log("peso de los padres: "+ parentsPartOfSpeechWeight+ " \n");

			modifiersCoincidenceWeight = 100 - parentsPartOfSpeechWeight;

			console.log("peso de los modifiers: "+ modifiersCoincidenceWeight+ " \n");

			console.log("porcentajeObtenido(parents): "+ this.getEquivalentPercentage(parentsPartOfSpeechWeight, parentsPartOfSpeechCoincidence) + " \n");

			console.log("porcentajeObtenido(modifiers): "+ this.getEquivalentPercentage(modifiersCoincidenceWeight,modifierComparisonCoincidence) + " \n");

			console.log("grado total de coincidencia: "+ (this.getEquivalentPercentage(parentsPartOfSpeechWeight, parentsPartOfSpeechCoincidence) +this.getEquivalentPercentage(modifiersCoincidenceWeight,modifierComparisonCoincidence)) + " \n");

			coincidenceDegree= this.getEquivalentPercentage(parentsPartOfSpeechWeight, parentsPartOfSpeechCoincidence) +this.getEquivalentPercentage(modifiersCoincidenceWeight,modifierComparisonCoincidence);
			
			if (coincidenceDegree > greaterCoincidenceDegree){

				greaterCoincidenceDegree = coincidenceDegree;
			}
			
		}

		return greaterCoincidenceDegree;
	}

	analyzeModifiers(modifiers,data) {
		
		var limit= modifiers.length;
		var score=0;
		for(let i=0; i < limit; i++)
		{
			this.analyzeTokens(this.generateNewToken(modifiers[i]),data);
		}

		
	}


	analyzeTokens(token,data) {
		
		//if token is an entity or keyword
		if (token.isEntity(this.entityList)) { 
			
			if (token.visited===false){
				data.answerEntities+=1;
				token.visited=true;
				
			}


			// search answer token in user answer
			var  appearancesList = this.treeAnalyzer.searchEntityInAnswer(token, this.userAnswer,this.entityList);

			if ( appearancesList.length >0 ){ 
				
				//console.log("\n \n cantidad de apariciones: "+ appearancesList.length+ " \n \n");
				var result= this.AnalyzeEntityAppearances(token,appearancesList);
				data.amountPercentage+=result;
				if ( result >= this.coincidenceFactor)
				{

					console.log("\n coincidió: "+ token.text + "\n");
					//increase entity coincidence value in the asnwer JSON response
					data.entitiesCoincidence+=1;
					
				}
			}

		}
		
		if (token.hasOwnProperty("modifiers") && token.modifiers!= undefined){
			  this.analyzeModifiers(token.modifiers,data);
		}

	}

	generateNewToken(tokenData){

		var isEntity=true;
		if (tokenData.hasOwnProperty("entity")===false){
			isEntity= undefined;
		}

		var temp = new TOKEN( tokenData.pos, false, tokenData.text , tokenData.lemma , tokenData.label , tokenData.partOfSpeech , isEntity );
		temp.setModifiers(tokenData.modifiers);
		temp.setVisited(tokenData.visited);
		// tokenData.visited=true;
		return temp;
	}

	initComparison(){

		var limit= this.answers.length;
		var sentences;

		for (let i=0; i < limit; i++) {


			sentences= this.answers[i].length;
			var answerComparisonData={
					"index": i,
					"text": "",
					"coincidenceDegree":0,
					"answerEntities":0,
					"entitiesCoincidence":0,
					"amountPercentage":0,
					"match":true
			}

			for(let j= 0; j< sentences; j++){

				console.log("\n comparando con respuesta \n");
				console.log("\n" + this.answers[i][j].sentence +"\n");
				answerComparisonData.text +=  this.answers[i][j].sentence + " ";
				this.analyzeTokens(this.generateNewToken(this.answers[i][j].root),answerComparisonData);

			}
		
			//average of coincidence amount percentage and expected asnwer entities number
			answerComparisonData.coincidenceDegree=answerComparisonData.amountPercentage/ answerComparisonData.answerEntities ;
			if (answerComparisonData.coincidenceDegree < this.coincidenceFactor){
				answerComparisonData.match=false;
			}

			//add to the answer comparison stadistics
			this.coincidenceWithAnswers.push(answerComparisonData);
			

		}

		console.log("All answers data: \n \n ");
		console.log(this.coincidenceWithAnswers);

	}


}

/******************************
segunda implementación
******************************/
class AnswerChecker {

	constructor(question,answer,checkerLanguage){

		this.question=question;
		this.answer= answer;

		this.checkerLanguage= checkerLanguage;

		this.includedKeyWords=[];

		this.totalPoints=this.question.keyWords.length;
		this.validSentence=0;
		//list of keywords, each key word
		this.synonymsList= this.question.keyWords;

		this.gottenPoints= this.analyzeSentence(this.synonymsList,this.answer);

		this.correctFactor=0.70;

	}


	textFormating(text){
		return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
	}


	fullSynonymsComparison(list, word){
		var limit= list.length;

		for(let i=0; i <limit; i++){

			if (stringSimilarity.compareTwoStrings(list[i],word) >= 0.75 ){
				return true;
			}
		}
		return false;

	}

	compareWithSynonyms(word) {
		var limit= this.synonymsList.length;
		word= this.textFormating(word);

		for(let i=0; i < limit; i++){

			if (this.fullSynonymsComparison (this.synonymsList[i],word)) { //if the word is in the synonyms list at position i

				this.includedKeyWords.push(this.synonymsList[i]);
				this.synonymsList.splice(i,1);

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
		//must consider what are really "keywords"
		// if ((token.partOfSpeech.tag===this.checkerLanguage.verb && token.label != this.checkerLanguage.auxiliar)
		// 	|| token.partOfSpeech.tag=== this.checkerLanguage.noun ){
		//
		// 	score = this.compareWithSynonyms(token.lemma);
		//
		// }
		score = this.compareWithSynonyms(token.lemma);

		if (token.hasOwnProperty("modifiers") && token.modifiers!= undefined){
			score += this.analyzeModifiers(token.modifiers);
		}

		return score;
	}

	analyzeSentence(synonymsList,answer) {
		var score=0;
		var data= answer.getData();


		var limit= data.length; //get the sentences amounts
		for (let i=0; i < limit; i++) {

			if (data[i].valid===this.validSentence ){ //if the sentences has a valid format
				score += this.analyzeTokens(data[i].root);
			}

		}

		return score;

	}

	getFinalScore() {

		return (this.gottenPoints / this.totalPoints) *100;
	
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

class PARAGRAPH {
    constructor(sentences, tokens, entities){
    	this.sentencesValidation=[]; //have values for represent sentences valid state -1= válido, 0= válido
        this.tokens = [];

        Object.keys(entities).forEach(key =>{
          var entity = entities[key];
          for(let x = 0; x< entity.mentions.length; x++){
            let c = 0;
         //   console.log(entity.mentions[0])
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

        this.sentence= new sentenceChecker();
        for(let x = 0; tokens[x]!=undefined;x++){
            let token = tokens[x];
            let partOfSpeech = {};
            Object.keys(token.partOfSpeech).forEach(key => {
            	//incluir las part of speech que no contienen unknow en su valor
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
            if (token.text.content[0]==='.'){
            	j++;
            	this.sentencesValidation.push(this.sentence.isValid());
            	if ( j < sentences.length){

            		this.sentence= new sentenceChecker();

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
    	// res.send(JSON.stringify(results))

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



          	res.send(JSON.stringify({"treeData": paragraph}));
        })
        .catch(e =>{
        	var paragraph = new PARAGRAPH(syntax[0].sentences,syntax[0].tokens, {}).sentences;

        	res.send(JSON.stringify({"treeData": paragraph}));
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


app.get('/genQuestion', function(req,res) {

  console.log("atendiendo petición .........");

  req.query= JSON.parse(JSON.stringify(req.query));

  var googleApiManager = new GoogleApiManager(GoogleNLP);
  var fileManager = new FileManager(fs,'QuestionsData/questions.json');


  var answersTrees=[];
  var answers = JSON.parse(req.query.answers);

  var words = JSON.parse(req.query.words);
	var keyWords = '';
	for (var key in words) {
		for (var x = 0; x<words[key].length;x++) {
			keyWords+=words[key][x] + ' '
		}
	}
	GoogleNLP
 .analyzeSyntax({document: {
		 content: keyWords,
		 type: 'PLAIN_TEXT',
 		}})
	 .then(results => {
		 var c = 0;
	 	for (var key in words) {
	 		for (var x = 0; x<words[key].length;x++) {
				words[key][x] = results[0].tokens[c].lemma;
				c++;
			}
		}
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
	  		ansM.getTreeForAnswers(answers, 0 ,answersTrees, ansM.getEnvironment() ,function(response,trees){
					let entityCounter = {};
					let isEntity = (token, entities) => {
						let itIs=false;
						for (var key in entities) {
							for (var synonym in entities[key]) {
								if (stringSimilarity.compareTwoStrings(entities[key][synonym], token.lemma ) >= 0.75){
									itIs=true;
									entityCounter[key] = true;
								}
							}
						}
						for (var modifier in token.modifiers) {
							if(isEntity(token.modifiers[modifier],entities))
								itIs=true;
						}
						return itIs;
					}
	  			if (response){
						for (var paragraph in trees){
							var valid = false;
							for (var sentence in trees[paragraph]){
								if (trees[paragraph][sentence].valid==-1){
									res.send(JSON.stringify({"success":false,"Questions": [], "Error": `"${trees[paragraph][sentence].sentence}" is not a complex sentence`} ));
									return;
								}
								if(isEntity(trees[paragraph][sentence].root, words)){
									valid = true;
									break;
								}
							}
							if(!valid){
								res.send(JSON.stringify({"success":false,"Questions": [], "Error": 'All Answers must mention at least one Entity from the entity list'} ));
								return;
							}
						}
	  				forWrite.answers= trees;
	  				for( var key in words){
							if(!entityCounter[key]){
								res.send(JSON.stringify({"success":false,"Questions": [], "Error": `Entity "${key}" is not used in any answer`} ));
							}
			  			forWrite.keyWords.push(words[key]);
			  		}

			  		fileManager.fileData.Questions.push(forWrite);
					 	fileManager.writeInFile(function(resp){

					 	if (resp){

					 		res.send(JSON.stringify({"success":true,"Questions": fileManager.getQuestionsInMemory()} ));
					 	}
					 	else{
					 		res.send(JSON.stringify({"success":false,"Questions": [], "Error": 'Not resp'} ));
					 	}
					 });
	  			}

	  			else{
	  				res.send(JSON.stringify({"success":false,"Questions": [], "Error": 'Not response'} ));
	  			}

	  		});
	  	}
	  });
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

app.get('/isCorrectAnswer',function(req,res) {

	console.log("Atendiendo peticion");
	var googleApiManager = new GoogleApiManager(GoogleNLP);
	var fileManager = new FileManager(fs,'QuestionsData/questions.json');
	var ansM= new AnswersManager(googleApiManager);

	fileManager.getQuestionById(req.query.questionID ,function(questionData,result){

		if (result){

			ansM.getTreeForAnswers ([req.query.answer], 0 ,[] , ansM.getEnvironment() ,function(response,trees){
				if (response){
					var answer= new Answer(questionData.questionID,1,trees[0]);

					var answerChecker= new AnswerChecker(questionData, answer, interviewLanguage);


					res.send(JSON.stringify({"success":true ,"AnswerData":{"totalScore": answerChecker.totalPoints, "gottenScore": answerChecker.gottenPoints, "finalGrade": answerChecker.getFinalScore() ,
										"isCorrectAnswer": answerChecker.isCorrectAnswer(), "pendingKeyWords": answerChecker.synonymsList, "mentionedKeyWords": answerChecker.includedKeyWords } }));
				}

				else{
					res.send(JSON.stringify({"success":false ,"AnswerData":{}}));
				}
			});

		}


		else{
			res.send(JSON.stringify({"success":false ,"AnswerData":{}}));
		}

	});

})


app.get('/isCorrectAnswerAdvancer',function(req,res){

	console.log("Atendiendo peticion");
	var googleApiManager = new GoogleApiManager(GoogleNLP);
	var fileManager = new FileManager(fs,'QuestionsData/questions.json');
	var ansM= new AnswersManager(googleApiManager);

	fileManager.getQuestionById(req.query.questionID ,function(questionData,result){

		if (result){

			ansM.getTreeForAnswers ([req.query.answer], 0 ,[] , ansM.getEnvironment() ,function(response,trees){
				if (response){
					var answer= new Answer(questionData.questionID,1,trees[0]);

	
					console.log("\n \n Iniciando comparación de respuestas \n \n ");
					
					var tr= new AnswersComparator(fileManager.fileData.Questions[req.query.questionID].answers, trees[0],questionData.keyWords);
					resp= tr.initComparison();


					res.send(JSON.stringify({"success":true, 
										"coincidenceWithAnswers": tr.coincidenceWithAnswers}));
				}

				else{
					res.send(JSON.stringify({"success":false ,"coincidenceWithAnswers":{}}));
				}
			});


		}


		else{
			res.send(JSON.stringify({"success":false ,"coincidenceWithAnswers":{}}));
		}

	});
})

var server = app.listen(8081, function ()
{
	var host = server.address().address;
    var port = server.address().port;
    console.log("Listen at %s:%s", host, port);
});
