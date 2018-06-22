import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { labels, keyWords } from './google.syntax';

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
  private ruta = '';
  displayedColumns = ['Entity', 'Score'];
  private analysis = [];
  private tree;
  private token;
  private label;
  private sentence;
  labels = labels;
  keyWords = keyWords;
  constructor(private http: HttpClient) { }
  count(list) {
    let x = 0;
    while (list !== undefined && list[x] !== undefined) {
      x++;
    }
    return x;
  }
  ngOnInit() {
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
    this.tree = undefined;
    this.sentence = undefined;
    this.token = undefined;
    this.analysis = [];
    this.procs = [];
    this.procs.push(0);
    this.texto = this.capKeyWords(this.texto);
    this.http.get(`${this.server}${this.endpoints[1].route}`,
      {params: {text: this.texto}}).
      subscribe(res => {
        for (let c = 0; c < (<Array<Object>>res).length; c++) {
          const sentence = res[c];
          res[c].pos = c;
          this.flatten(sentence['root'], c).forEach(token => {
            this.analysis[token['pos']] = token;
            token['background'] = this.stringToColour(token['label']);
            token['contrast'] = this.contrast(token['background']);
          });
        }
        this.tree = res;
        this.procs.pop();
        console.log(this.analysis);
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
    console.log(cBrightness);
    if (cBrightness > threshold) {return '#000000'; } else { return '#FFFFFF'; }
    }

  flatten(root, sentence): Array<Object> {
    let response = [];
    console.log(sentence);
    response.push({
      pos: root.pos,
      text: root.text,
      label: root.label,
      partOfSpeech: root.partOfSpeech,
      lemma: root.lemma,
      parent: root.parent === undefined ? root.pos : root.parent,
      sentence: sentence});
    if (root['modifiers'] !== undefined) {
      response[0]['children'] = [];
      console.log(`${root.text} has children`);
      root['modifiers'].forEach(token => {
        response[0].children.push(token.pos);
        token['parent'] = root.pos;
        response = response.concat(this.flatten(token, sentence));
      });
    }
    return response;
  }
}
