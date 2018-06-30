var express = require('express');
var app = express();
var http =  require('http');


/*********************************************************
	STRING SIMILARITY
*********************************************************/

// librería o paquete para comparar strings, no es case sensitive. Retorna un valor entre 0 y 1
var stringSimilarity = require('string-similarity');

// librería o paquete que permite utilizar los servicios de procesamiento de lenguaje natural que provee google
const glanguage = require('@google-cloud/language');
const request = require('request');

/**************************
	Para manejo de archivos
***************************/
const fs = require('fs');

/**********************************************************
	Es un archivo .json que contiene algunas de las etiquetas de syntaxis que utiliza google cloud
**********************************************************/
const interviewLanguage= require('./LanguageData/English_SyntaxData').DATA;

var language="en";


/**********************************************************
  Instancia de Google Natural Language Processing. Para poder usar los métodos que provee el API
**********************************************************/
const GoogleNLP = new glanguage.LanguageServiceClient();


app.use(function(req, res, next)

{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "DELETE, GET, POST");
    next();
});


/***********************************************************
Proposito: Controlar la lectura y escritura en el archivo donde se almacenan las preguntas(por ser demo)
Atributos:
	fileStream: una instancia de fs (paquete para manejar archivos)
	filePath:
	fileData: Para alamcenar el contenido del archivo que es leído, o que será escrito 
***********************************************************/
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

	// obtiene las preguntas almacenadas en fileData, luego de que el archivo ha sido leído	
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


/***************************************************************************************
Próposito: Obtener para una lista de respuestas el árbol gramatical de cada una
			utilizando el API de gogle

Atributos:
	googleApiManager: Una instancia del objeto que permite consumir el API de google
	
****************************************************************************************/
class AnswersManager {
	constructor(googleApiManager){
		this.googleApiManager=googleApiManager;
	}

	// Propósito: Asegurar que toda oración de una respuesta termine con un punto
	addPoint(text){

		if (text[text.length-1] != '.'){
			text+= '.';
		}

		return text;
	}

	getEnvironment(){
		return this;
	}


	/* Propósito: Obtener para cada respuesta de la lista el árbol gramatical que corresponda
	   Parámetros:
	   	answers: lista de respuestas (son string normales)
	   	index:Posición de la lista que se está evaluando
	   	answersTrees: lista de árboles para las respuestas, (se respeta el orden de las respuestas)
	   	environment: Con las llamdas asíncronas se pierde this, para llamar a funciones de la clase se requiere
	   	callback: función a ejecutar una vez que todos los árboles han sido generados
	*/
	getTreeForAnswers (answers,index, answersTrees ,environment, callback) {


		if (index === answers.length){

			return callback(true,answersTrees);
		}

		else
		{

			answers[index]= environment.addPoint(answers[index]);

			//Primer paso para utilizar el API, indicarle el texto al que debe generar el árbol
			environment.googleApiManager.setDocument( answers[index] ,'PLAIN_TEXT');

		  	var entities={};
		  	//obtener las entidades(similar a keyWords) del texto, con información de sentimiento
		  	environment.googleApiManager.EntitiesSentiment(function(results, result){

		  		if (result) {

		  			//agregar cada entidad reconocida a un diccionario
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

		        // obtener árbol gramatical, del API de Google
		        environment.googleApiManager.AnalyzeSyntax(function(syntaxData,result){

		        	if (result){

		        		//dar formato al JSON retornado por el API. Cada entidad contendrá en su diccionario la clave "entity"
		        		var answerTree= new PARAGRAPH(syntaxData[0].sentences,syntaxData[0].tokens, entities).sentences;

		        		answersTrees.push(answerTree); 

		        		index+=1;

		        		//evaluar la siguiente posición, una vez que es seguro que se generó el árbol de la respuesta

		        		environment.getTreeForAnswers(answers, index,answersTrees, environment ,callback);

		        	}
		        	else
		        	{
						
		        		return callback(false,[]);
		        	}

		  		  });
		    }

		    else {
		    	return callback(false,[]);
		    }

		  });
		}
	}
}

/***************************************************************************************
Próposito: Encapsular los métodos que permiten utilizar los servicios del Api de google

Atributos:
	googleNLP: instancia del paquete para utilizar el API
	Document: Establecer el tipo de entrada(texto plano / archivo) para los servicios de google
	
****************************************************************************************/
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

	//obtener árbol gramatical
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

    //obtener los sentimientos asociados a cada entidad del documento
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

/***************************************************************************************
Próposito: Encapsular todas las propiedades que google le asigna a cada palabra en una clase

Atributos:
	
****************************************************************************************/

class TOKEN {
    constructor(pos, modifies, text, lemma, label, partOfSpeech, entity){
        this.pos = pos;

        //Determina si esta palabra modifica a alguna otra
        this.modifies = modifies;
        this.text = text;
        this.label = label;
        this.partOfSpeech = partOfSpeech;
        this.lemma = lemma;
        
        // lista de tokens que representan palabras que afectan el significado de la palabra
        this.modifiers = [];

        // Determinar si el token es entidad (similar a keyword) o no
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

    //Construye la lista de modificadores de la palabra
    genTree(tokenList){
        for(let x = tokenList.length-1;x>=0;x--){

        	// si el token modifica a este (verificado por medio de la posición)
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

    /*  Propósito: determinar si el token es una entidad (keyWord)
    	entityList: .lista de listas. donde cada sublista es una palabra clave y sus sinónimos
	*/
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

	
	/* Propósito: Determinar si el token es equivalente al recibido por parámetro
	   haciendo uso de la lista de palabras clave, y comparando los lemas de ambos tokens directamente
	*/

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


	/*
	Obtener de entre los modificadores aquellos tokens que son verbos, sustantivos o adjetivos
	*/
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


/***************************************************************************************
Próposito: Verificar la validéz de una oración con base en sustantivos, pronombres, verbos y otros tipos de palabras

Atributos:
	syntaxData
****************************************************************************************/
class sentenceChecker {

	constructor(){

		this.syntaxData={
			nouns_prons:0,  //sustantivos y pronombres tienen la misma interpretación en este caso.
			verbs:0,
			others:0, //auxiliars, adv, attributes, etc
			validFormat: true //no depednde de ningún otro contador
		}

	}


	// Caso especial cuando do o does tienen n't no son verbos, sino auxiliarea
	checkForAux(token,tokenList,index){

		if (token.dependencyEdge.label != interviewLanguage.auxiliar){

			if (index < (tokenList.length-1) && tokenList[index+1].dependencyEdge.label != interviewLanguage.negation){
				this.syntaxData.verbs+=1;
				return;

			}

		}

		this.syntaxData.others++;


	}

	//caso especial para el uso de 's. Tiene que utilizarse con pronombres o sustantivos
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

	// Propósito: Actualizar los contadores a partir del token en la posición que indica el índice.
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

	// 0 = oración válida, -1= Oración inválida
	isValid() {
		if (this.syntaxData.validFormat===false){
			return -1;
		}
		else if (this.syntaxData.verbs > 0 && this.syntaxData.nouns_prons > 0 &&  this.syntaxData.others >0){
			return 0;

		}
		else if (this.syntaxData.verbs===0){ 
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


/***************************************************************************************
Próposito: Encargada de realizar un recorrido sobe el árbol gramatical
****************************************************************************************/
class TreeAnalyzer {

	constructor() {
		this.validSentence=0;
		this.entityList=[];
	}

	// Propósito: Retornar una lista con las apariciones (tokens) en la respuesta del usuario que sean equivalentes al token recibido por parámetro 
	searchEntityInAnswer (entityToken, userAnswer,entities) {
		this.entityList=entities;
		var limit= userAnswer.length; //obtener la cantidad de oraciones

		var resultToken;
		var entityAppearances=[];
		for (let i=0; i < limit; i++) {

			if (userAnswer[i].valid===this.validSentence ){ // si la oración es válida 

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


	/* 
	Propósito: Comparar el token de la respuesta esperada, con el token actual de la respuesta del usuario. Recorrer los modifiers del token
	de la respuesta del usuario
	
	*/

	analyzeTokens(currentToken,answerToken, entityAppearances){

		if ( currentToken.isEquivalent( answerToken , this.entityList) ){

			// agregar el token a la lista de apariciones
			entityAppearances.push(currentToken);
		}

		if (currentToken.hasOwnProperty("modifiers") && currentToken.modifiers!= undefined){
			entityAppearances =this.analyzeModifiers(currentToken.modifiers,answerToken, entityAppearances);
		}

		return entityAppearances;

	}

}


/***************************************************************************************
Próposito: Una clase para comparar las posibles resupestas para una pregunta con la respuesta brindada por el usuario
		   Para cada posible respuesta se asigna un valor que determina que tan parecida es la respuesta del usuario

****************************************************************************************/
/*
 Luego, modificar esta clase para hacer que pueda controlar cuando una keyWord ( entidad) aparece muchas veces
 porque eso podría alterar los contadores para las entidades de las respuestas.
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
		

	}

	/*
	Propósito: Comparar el part of speech de ambos token para contar las etiquetas que coinciden. Retorna un valor númerico según las coincidencias
	*/
	//FORGIVE: especifica que los tokens son similares si el total de las etiquetas es mayor al de las coincidencias solo por una unidad
	
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


	/*
	Propósito: Buscar el token recibido por parámetro, en la lista de modificadores del token
	Nota: al obtener los datos de la pregunta del archivo .json, se debe hacer un objeto token para acceder a los métodos de la clase
	*/

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

	// Retorna un valor númerico que establece que tan similar son los modificadores de ambos tokens, 
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

	/*
	Propósito: Obtener a cuanto porcentaje equivale el grado de coincidencia
	*/
	getEquivalentPercentage(realPercentage, coincidenceDegree){
		if (coincidenceDegree>= this.coincidenceFactor){
			return realPercentage/100;
		}

		else{
			return (Math.round(realPercentage*coincidenceDegree))/100;
		}
	}



	/*
	Propósito: Analiza las apariciones del token en la respuesta del usuario
	Retorna un valor númerico que establece cual es la aparición tiene el mayor grado de coincidencia
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
		//comparar las etiquetas del partOfspeech
			parentsPartOfSpeechCoincidence = this.compareTokensPartOFSpeech(answerToken,appearancesList[i],true);

			
			// obtener los modificadores relevantes del token en la posición i 
			tokenResModifiers = appearancesList[i].relevantModifiers();

			// Comparar los token modificadores del token de la respuesta del usuario y el token de la respuesta esperada
			modifierComparisonCoincidence = this.getTokensModifiersCoincidenceDegree(tokenResModifiers, tokenModifiers);

			parentsPartOfSpeechWeight= 100- ((100 /(tokenModifiers.length+2))* tokenModifiers.length);

			modifiersCoincidenceWeight = 100 - parentsPartOfSpeechWeight;

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

	/**
	Pendiente asegurar que los contadores de coincidencias se mantienen consistentes, incluso cuando 
	*/
	analyzeTokens(token,data) {
		
		//si el token de la respuesta es una entidad
		if (token.isEntity(this.entityList)) { 

			if (token.visited===false){

				//aumentar el contador de entidades para esta respuesta
				data.answerEntities+=1;
				token.visited=true;

			}


			// Buscar en la respuesta del usuario, el token actual 
			var  appearancesList = this.treeAnalyzer.searchEntityInAnswer(token, this.userAnswer,this.entityList);


			// si el token aparece en la respuesta del usuario aunque sea una vez
			if ( appearancesList.length >0 ){ 
				
				//obtener el mayor valor de coincidencia de las apariciones del token en la respuesta del usuario
				var result= this.AnalyzeEntityAppearances(token,appearancesList);
				data.amountPercentage+=result;

				// si cumple con el factor de coincidencia
				if ( result >= this.coincidenceFactor)
				{

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

		//si existe la clave entity en los datos del token
		if (tokenData.hasOwnProperty("entity")===false){
			//undefinied significa que no es una entidad;
			isEntity= undefined;
		}

		var temp = new TOKEN( tokenData.pos, false, tokenData.text , tokenData.lemma , tokenData.label , tokenData.partOfSpeech , isEntity );
		temp.setModifiers(tokenData.modifiers);
		temp.setVisited(tokenData.visited);
		return temp;
	}


	/************************************************************************************************
	NOTA: Antes de iniciar cada recorrido de respuestas sería necesario convertir en un token cada diccionario que representa la información de una palabra
		  Para efectos del DEMO,, se hace un objeto cada vez que se requiere. Pero puede mejorarse

	*************************************************************************************************/
	initComparison(){

		var limit= this.answers.length;
		var sentences;

		for (let i=0; i < limit; i++) {


			sentences= this.answers[i].length;

			//para cada respuesta guardar unas estadísticas al compararla con el usuario 
			var answerComparisonData={
					"index": i,
					"text": "",
					"coincidenceDegree":0,
					"answerEntities":0,
					"entitiesCoincidence":0,
					"amountPercentage":0,
					"match":true
			}

			// recorrer las oraciones de la respuesta
			for(let j= 0; j< sentences; j++){

				console.log("\n comparando con respuesta \n");
				console.log("\n" + this.answers[i][j].sentence +"\n");
				answerComparisonData.text +=  this.answers[i][j].sentence + " ";
				this.analyzeTokens(this.generateNewToken(this.answers[i][j].root),answerComparisonData);

			}
		
			// promedio del total del procentaje y el número de entidades que esperaba la respuesta

			answerComparisonData.coincidenceDegree=answerComparisonData.amountPercentage/ answerComparisonData.answerEntities ;
			if (answerComparisonData.coincidenceDegree < this.coincidenceFactor){
				answerComparisonData.match=false;
			}

			//agregar a la lista de estadísticas de coincidencia para cada respuesta
			this.coincidenceWithAnswers.push(answerComparisonData);


		}

		console.log("All answers data: \n \n ");
		console.log(this.coincidenceWithAnswers);

	}


}


/***************************************************************************************
Próposito: Verificar si la respuesta es correcta con respecto a las palabras clave

****************************************************************************************/
class AnswerChecker {

	constructor(question,answer,checkerLanguage){

		this.question=question;
		this.answer= answer;

		this.checkerLanguage= checkerLanguage;

		//especifica las palabras clave que el usuario mencionó
		this.includedKeyWords=[];

		this.totalPoints=this.question.keyWords.length;
		this.validSentence=0;
		//lista de palabras clave, las palabras clave q
		this.synonymsList= this.question.keyWords;

		this.gottenPoints= this.analyzeSentence(this.synonymsList,this.answer);

		this.correctFactor=0.70;

	}


	textFormating(text){
		return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
	}

	// Propósito: Buscar una palabra en la lista de sinónimos de una palabra clave
	fullSynonymsComparison(list, word){
		var limit= list.length;

		for(let i=0; i <limit; i++){

			if (stringSimilarity.compareTwoStrings(list[i],word) >= 0.75 ){
				return true;
			}
		}
		return false;

	}

	//Propósito: Determinar si una palabra se encuentra en la lista de palabras clave
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
		//Se necesita considerar ¿qué son las palabras clave?, si solo sutantivos, verbos u adjetivos para realizar un validación aquí
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
	Data: conjunto de oraciones, por oración se tiene una lista de tokens y una propiedad valid 0= valido, -1 = invalido
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

/***************************************************************************************
Próposito: Construye un parrafo que contiene todas las oraciones de un texto, Se da un formato mejor para 
		   cada token del texto. Puede mejorarse en cuanto a reducción de ciclos
****************************************************************************************/

class PARAGRAPH {
    constructor(sentences, tokens, entities){
    	this.sentencesValidation=[]; //Tiene valores para representar el estado de las oraciones del párrafo  0= válido, -1 = inválido
        this.tokens = [];

        //asignar a los token que representan entidades (similar a keywords) la información del análisis de sentimiento
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

        var j=0; // es para tener un contador de oraciones, apliado para la validación de cada oración.

        this.sentence= new sentenceChecker();

        //dar formato a todos los tokens del árbol gramatica
        for(let x = 0; tokens[x]!=undefined;x++){
            let token = tokens[x];
            let partOfSpeech = {};

            // descartar etiquetas del partOfSpeech que contengan la palabra unknown
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

            //Si terminó una oración
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

        //  construir una lista de token que son raíz ( cada oración tiene un token raíz)
        this.tokens.forEach(token =>{
            if(token.isRoot()){
                this.rootList.push(token);
            }
        });

        var i=0;

        //Para cada token raíz construir su lista de modificadores
        this.rootList.forEach(root =>{

            this.tokens = root.genTree(this.tokens);
            root.cleanUp();
            // Insertar una oración al párrafo
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

	  /*******************************************************
			Se valida:

			--Que cada respuesta mencione al menos una palabra clave de la lista de palabras clave
			-- Que cada palabra clave sea utiliza en al menos una respuesta
			-- Que las oraciones que comprenden cada respuesta sean todas válidas

	  ********************************************************/

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


app.get('/isCorrectAnswerAdvanced',function(req,res){

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

					
					var ansC= new AnswersComparator(fileManager.fileData.Questions[req.query.questionID].answers, trees[0],questionData.keyWords);
					ansC.initComparison();


					res.send(JSON.stringify({"success":true, 
										"coincidenceWithAnswers": ansC.coincidenceWithAnswers}));

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
