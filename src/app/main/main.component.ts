import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    {route: 'googleLanguage', name: 'Google', color: '#558ff1'},
    {route: 'amazonComprehend', name: 'Amazon', color: '#1b2532'},
    {route: 'azureCognitiveService', name: 'Azure', color: '#a5ce00'},
    {route: 'aylienTextApi', name: 'Aylien', color: '#28384e'}
  ];
  private pregunta = '';
  private respuesta = '';
  private ruta = '';
  displayedColumns = ['Entity', 'Score'];
  private stats = [];
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
    this.endpoints.forEach(element => {
      this.procs.push(0);
      this.http.get(`${this.server}${element.route}`,
        {params: {text: this.texto}}).
        subscribe(res => {
          res['name'] = `${element.name} - ${res['keyScores'].length} entities found`;
          res['color'] = element['color'];
          this.stats.push(res);
          this.procs.pop();
        });
    });
  }
}
