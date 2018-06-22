import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// Las puntuaciones deben ir de -1 (negativo) a 1 (positiva), siendo 0 una puntuación neutral
interface NLPRES {
  score: Number;
  keyWords: String[];
  keyScores: [{key: String, value: Number}];
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  private texto = '';
  private server = 'http://localhost:8081/';
  private procs = [];
  private endpoints = [
    {route: 'IBMWatson', name: 'Watson[IBM]', color: '#051b75'},
    {route: 'googleTree', name: 'Google', color: '#558ff1'},
    {route: 'amazonComprehend', name: 'Amazon', color: '#1b2532'},
    {route: 'azureCognitiveService', name: 'Azure', color: '#a5ce00'},
    {route: 'aylienTextApi', name: 'Aylien', color: '#28384e'}
  ];
  private pregunta = '';
  private respuesta = '';
  private ruta = '';
  displayedColumns = ['Entity', 'Score'];
  private stats = [];
  private analysis = [];
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) { }
  count(list) {
    let x = 0;
    while (list !== undefined && list[x] !== undefined) {
      x++;
    }
    return x;
  }
  ngOnInit() {
  }
  refine(keyScores) {

  }
  responder() {
    if (this.ruta !== '') {
      this.http.get(`${this.server}${this.ruta}`,
        {params: {text: this.texto}}).
        subscribe(res => {

        });
    }
  }
  checkText() {
    console.log('Chequeando texto');
    this.procs = [];
    this.stats = [];
    this.procs.push(0);
    this.http.get(`${this.server}${this.endpoints[1].route}`,
      {params: {text: this.texto}}).
      subscribe(res => {
        console.log(res);
        const paragraph = [];
        (<Array<Object>>res).forEach(sentence => {
          this.flatten(sentence['root']).forEach(token => {
            paragraph[token['pos']] = token;
            token['background'] = this.stringToColour(token['partOfSpeech'].tag);
            token['contrast'] = this.contrast(token['background']);
          });
        });
        this.procs.pop();
        this.analysis = paragraph;
        console.log(JSON.stringify(this.analysis));
      });
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
    console.log(cBrightness);
    if (cBrightness > threshold) {return '#000000';} else { return '#FFFFFF';}
    }

  flatten(root): Array<Object> {
    let response = [];
    response.push({pos: root.pos, text: root.text, label: root.label, partOfSpeech: root.partOfSpeech, lemma: root.lemma});
    if (root['modifiers'] !== undefined) {
      root['modifiers'].forEach(token => {
        response = response.concat(this.flatten(token));
      });
    }
    return response;
  }
}
