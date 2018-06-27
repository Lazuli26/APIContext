import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { labels, keyWords } from './google.syntax';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  private texto = '';
  private questionIndex;
  private server = 'http://localhost:8081/';
  private procs = [];
  private endpoints = [
    {route: 'IBMWatson', name: 'Watson[IBM]', color: '#051b75'},
    {route: 'googleTree', name: 'Google', color: '#558ff1'},
    {route: 'amazonComprehend', name: 'Amazon', color: '#1b2532'},
    {route: 'azureCognitiveService', name: 'Azure', color: '#a5ce00'},
    {route: 'aylienTextApi', name: 'Aylien', color: '#28384e'}
  ];
  private analysis = [];
  private tree;
  private token;
  private label;
  private sentence;
  private questionGen = {
    question: '',
    answers: [],
    keyWords: {}
  };
  private questionList = [];
  labels = labels;
  keyWords = keyWords;
  JSON = JSON;
  Object = Object;
  console = console;
  constructor(private http: HttpClient,
              private sanitizer: DomSanitizer,
              private router: Router,
              private snackBar: MatSnackBar) {
    this.getQuestions();
  }

  count(list) {
    let x = 0;
    while (list !== undefined && list[x] !== undefined) {
      x++;
    }
    return x;
  }
  ngOnInit() {
  }

  addEntity() {
    const entity = document.getElementById('entityName')['value'];
    const word = (/^\S+$/gm);
    if (!word.test(entity)) {
      this.openSnackBar('Must Be a Single Word', 'ok');
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
  delSynonym() {
    this.questionGen.keyWords[this.questionGen['entityIndex']].splice(this.questionGen['synonymsIndex'], 1);
    delete this.questionGen['synonymsIndex'];
  }
  delAnswer() {
    this.questionGen.answers.splice(this.questionGen['answerIndex'], 1);
    delete this.questionGen['answerIndex'];
  }

  getQuestions() {
    this.http.get(`${this.server}getQuestions`).subscribe((res: any) => {
      if (res.success) {
        this.questionList = <any>res.Questions;
      }
    });
  }
  checkEmpty (text) {
    const empty = (/\w*[a-zA-Z]\w*/gm);
    return empty.test(text);
  }
  checkSynonym() {
    const wordRegex = (/^\S+$/gm);
    const synonym = this.questionGen.keyWords[this.questionGen['entityIndex']][this.questionGen['synonymsIndex']];
    const pass = wordRegex.test(synonym);
    if (!pass) {
        return pass;
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

  answer() {
    this.procs.push(0);
    this.http.get(`${this.server}isCorrectAnswer`,
      {params: {answer: this.texto, questionID: this.questionIndex}})
      .subscribe((res: any) => {
        if (res.success) {
          console.log(res.AnswerData);
          this.openSnackBar(`Answer Score: ${res.AnswerData.finalGrade}`, 'Nice');
          this.procs.pop();
        } else {
          this.procs.pop();
        }
      });
  }
  openSnackBar(message: string, action: string) {
    this.snackBar.open(message, action, {
      duration: 5000,
    });
  }

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
        if (synonym === '') {
          status = false;
        }
      });
    });
    return status;
  }
  readTextFile(file, callback) {
    const rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType('application/json');
    rawFile.open('GET', file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status.toString() === '200') {
            callback(rawFile.responseText);
        }
    };
    rawFile.send(null);
  }

  loadFile() {
    this.readTextFile('/Users/Documents/workspace/test.json', function(text) {
        const data = JSON.parse(text);
        console.log(data);
    });
  }
  checkText() {
    this.label = undefined;
    this.tree = undefined;
    this.sentence = undefined;
    this.token = undefined;
    this.analysis = [];
    this.procs = [];
    this.procs.push(0);
    this.texto = this.capKeyWords(this.texto);
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
        this.procs.pop();
      });
  }
  capKeyWords(texto: string): string {
    return texto.replace(/\w+/g, (word: string) => {
      for (let x = 0; x < this.keyWords.length; x++) {
        if (this.keyWords[x].toLowerCase() === word.toLowerCase()) {
          return this.keyWords[x];
        }
      }
      return word;
    });
  }
  showToken(token) {
    this.label = undefined;
    this.token = token;
    this.token.keys = Object.keys(token.partOfSpeech);
  }
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
