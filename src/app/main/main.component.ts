import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { labels } from './google.syntax';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  // El campo de texto a analizar
  private texto = '';
  // La pregunta seleccionada por el usuario
  private questionIndex;
  // El servidor al que se harán las consultas
  private server = 'http://localhost:8081/';
  // Indica si hay algo en proceso
  private processsing = false;
  // El resultado del analisis de texto se guarda como una lista en este campo
  private analysis = [];
  // El resultado del analisis de texto se guarda en forma de arbol en este campo
  private tree;
  // El token seleccionado por el usuario (para la vista)
  private token;
  // El label seleccionado para mostrar información
  private label;
  // Indice para mostrar solo una oración especifica
  private sentence;
  // Para el generador de preguntas
  private questionGen = {
    question: '',
    answers: [],
    keyWords: {}
  };
  // Lista de preguntas existentes en el servidor
  private questionList = [];
  private answerResult;
  // Definiciones de los labels que retorna Google
  labels = labels;
  JSON = JSON;
  Object = Object;
  constructor(private http: HttpClient,
              private router: Router,
              private snackBar: MatSnackBar) {
    this.getQuestions();
  }

  ngOnInit() {
  }
  // Añade una entidad a la pregunta que se está creando
  addEntity() {
    const entity = document.getElementById('entityName')['value'];
    const word = (/^\S+$/gm);
    let counter = 0;
    Object.keys(this.questionGen.keyWords)
    .forEach(key => {
      this.questionGen.keyWords[key].forEach(synonym => {
        if ( synonym === entity ) {
          counter++;
        }
      });
    });
    // La entidad debe ser una palabra
    if (!word.test(entity)) {
      this.openSnackBar('Must Be a Single Word', 'ok');
      return;
    } else if ( counter !== 0) {
      this.openSnackBar(`"${entity}" already exists`, 'ok');
      return;
    } else {
      document.getElementById('entityName')['value'] = '';
      this.questionGen['synonymsIndex'] = undefined;
      this.questionGen['entityIndex'] = undefined;
      this.questionGen.keyWords[entity] = this.questionGen.keyWords[entity] ? this.questionGen.keyWords[entity] : [entity];
    }
  }
  delEntity() {
    delete this.questionGen.keyWords[this.questionGen['entityIndex']];
    delete this.questionGen['entityIndex'];
  }
  // Borra un sinonimo para una entidad
  delSynonym() {
    this.questionGen.keyWords[this.questionGen['entityIndex']].splice(this.questionGen['synonymsIndex'], 1);
    delete this.questionGen['synonymsIndex'];
  }
  delAnswer() {
    this.questionGen.answers.splice(this.questionGen['answerIndex'], 1);
    delete this.questionGen['answerIndex'];
  }
  // Carga las preguntas almacenadas en el servidor
  getQuestions() {
    this.http.get(`${this.server}getQuestions`).subscribe((res: any) => {
      if (res.success) {
        this.questionList = <any>res.Questions;
      }
    });
  }
  // Comprueba si un texto está vacío
  checkEmpty (text) {
    const empty = (/\w*[a-zA-Z]\w*/gm);
    return empty.test(text);
  }
  // Revisa si un sinonimo tiene formato valido y no existe en otra parte
  checkSynonym(synonym) {
    const wordRegex = (/^\S+$/gm);
    if (!wordRegex.test(synonym)) {
        return false;
    }
    let counter = 0;
    Object.keys(this.questionGen.keyWords)
    .forEach(key => {
      this.questionGen.keyWords[key].forEach(word => {
        if ( word === synonym ) {
          counter++;
        }
      });
    });
    return counter === 1;
  }
  // Para generar una pregunta en el servidor
  generate() {
    if (this.validateQuestion()) {
      this.http.get(`${this.server}genQuestion`,
      {params: {
        question: this.questionGen.question,
        answers: JSON.stringify(this.questionGen.answers),
        words: JSON.stringify(this.questionGen.keyWords)
      }}).subscribe((res: any) => {
        if (res.success) {
          this.questionList = <any>res.Questions;
          this.openSnackBar('Success!', 'Ok');
        } else {
          this.openSnackBar(`Request Failed: ${res.Error}`, 'Ok');
        }
      });
    } else {
      this.openSnackBar('You need to set a question and at least 1 answer and 1 entity', 'Ok');
    }
  }
  // Para responder una pregunta en el servidor por palabras clave
  answer() {
  this.processsing = true;
    this.http.get(`${this.server}isCorrectAnswer`,
      {params: {answer: this.texto, questionID: this.questionIndex}})
      .subscribe((res: any) => {
        if (res.success) {
          console.log(res.AnswerData);
          this.openSnackBar(`Answer Score: ${res.AnswerData.finalGrade}`, 'Nice');
          this.processsing = false;
        } else {
          this.processsing = false;
        }
      });
  }
  // Para responder una pregunta por analisis gramatical
  answerAdvanced() {
  this.processsing = true;
    this.http.get(`${this.server}isCorrectAnswerAdvanced`,
      {params: {answer: this.texto, questionID: this.questionIndex}})
      .subscribe((res: any) => {
        if (res.success) {
          console.log(res.coincidenceWithAnswers);
          this.answerResult = res.coincidenceWithAnswers;
          const scores = [];
          let total = 0;
          for (const sentence of res.coincidenceWithAnswers) {
            scores.push(sentence);
          }
          scores.sort((a, b) => b.coincidenceDegree - a.coincidenceDegree );
          let remaining = 1;
          const used = [];
          for (let x = 0; x < scores.length; x++) {
            let unique = 0;
            for (const keyWord of scores[x].coincidenceList) {
              if (!used.includes(keyWord)) {
                used.push(keyWord);
                unique++;
              }
            }
            const coincidences = scores[x].coincidenceList.length === 0 ? 1 : scores[x].coincidenceList.length;
            total += remaining * (scores[x].coincidenceDegree * (unique / coincidences));
            remaining = 1 - total;
          }
          this.answerResult.accumulative = total * 100;
          this.openSnackBar(`Accumulative score: ${total * 100}`, 'Nice');
          this.processsing = false;
        } else {
          this.processsing = false;
        }
      });
  }
  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 5000,
    });
  }
  // Valida la pregunta antes de generarla
  validateQuestion() {
    let status = this.questionGen.answers.length > 0 && Object.keys(this.questionGen.keyWords).length > 0;
    if (this.questionGen.question === '') {
      status = false;
    }
    this.questionGen.answers.forEach( question => {
      if (question === '') {
        status = false;
      }
    });
    Object.keys(this.questionGen.keyWords).forEach(key => {
      this.questionGen.keyWords[key].forEach(synonym => {
        if (!this.checkSynonym(synonym)) {
          status = false;
        }
      });
    });
    return status;
  }
  // Para realizar el analisis de texto
  checkText() {
    // Reinicia las variables
    this.label = undefined;
    this.tree = undefined;
    this.sentence = undefined;
    this.token = undefined;
    this.analysis = [];
    this.processsing = true;
    this.http.get(`${this.server}googleTree`,
      {params: {text: this.texto}}).
      subscribe(res => {
        for (let c = 0; c < (<Array<Object>>res['treeData']).length; c++) {
          const sentence = res['treeData'][c];
          res['treeData'][c].pos = c;
          this.flatten(sentence['root'], c).forEach(token => {
            this.analysis[token['pos']] = token;
            token['background'] = this.stringToColour(token['label']);
            token['contrast'] = this.contrast(token['background']);
          });
        }
        this.tree = res['treeData'];
        this.processsing = false;
      });
  }
  // Para muestra de un token en la interfaz
  showToken(token) {
    this.label = undefined;
    this.token = token;
    this.token.keys = Object.keys(token.partOfSpeech);
  }
  // Convierte una cadena de texto a color
  stringToColour(str) {
    let hash = 0;
    for (let x = 0; x < str.length; x++) {
      // tslint:disable-next-line:no-bitwise
      hash = str.charCodeAt(x) + ((hash << 5) - hash);
    }
    let colour = '#';
    for (let i = 0; i < 3; i++) {
      // tslint:disable-next-line:no-bitwise
      const value = (hash >> (i * 8)) & 0xFF;
      colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
  }
  getGreenToRed(percent) {
    const r = percent < 50 ? 255 : Math.floor(255 - (percent * 2 - 100) * 255 / 100);
    const g = percent > 50 ? 255 : Math.floor((percent * 2 ) * 255 / 100);
    return 'rgb(' + r + ',' + g + ',0)';
  }
  // Contrasta un color con el blanco o el negro
  contrast(hex) {
    const threshold = 130;
    const hRed = hexToR(hex);
    const hGreen = hexToG(hex);
    const hBlue = hexToB(hex);
    function hexToR(h) {return parseInt((cutHex(h)).substring(0, 2), 16); }
    function hexToG(h) {return parseInt((cutHex(h)).substring(2, 4), 16); }
    function hexToB(h) {return parseInt((cutHex(h)).substring(4, 6), 16); }
    function cutHex(h) {return (h.charAt(0) === '#') ? h.substring(1, 7) : h; }

    const cBrightness = ((hRed * 299) + (hGreen * 587) + (hBlue * 114)) / 1000;
    if (cBrightness > threshold) {return '#000000'; } else { return '#FFFFFF'; }
    }
  // Recibe la raiz de un arbol, la recorre y genera una lista con todos los nodos
  flatten(root, sentence): Array<Object> {
    let response = [];
    response.push({
      pos: root.pos,
      text: root.text,
      label: root.label,
      partOfSpeech: root.partOfSpeech,
      lemma: root.lemma,
      parent: root.parent === undefined ? root.pos : root.parent,
      sentence: sentence,
      entity: root.entity});
    if (root['modifiers'] !== undefined) {
      response[0]['children'] = [];
      root['modifiers'].forEach(token => {
        response[0].children.push(token.pos);
        token['parent'] = root.pos;
        response = response.concat(this.flatten(token, sentence));
      });
    }
    return response;
  }
}
