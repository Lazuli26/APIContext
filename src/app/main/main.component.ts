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
  private texto = 'Set the environment variable GOOGLE_APPLICATION_CREDENTIALS to the file path of the JSON file that contains your service account key. This variable only applies to your current shell session, so if you open a new session, set the variable again.';
  private server = 'http://localhost:8081/';
  private procs = [];
  private endpoints = [
    {route: 'IBMWatson', name: 'Watson[IBM]', color: '#051b75'},
    {route: 'googleLanguage', name: 'Google', color: '#558ff1'},
    {route: 'amazonComprehend', name: 'Amazon', color: '#1b2532'},
    {route: 'azureCognitiveService', name: 'Azure', color: '#a5ce00'}
  ];
  displayedColumns = ['sujeto', 'puntuacion'];
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
  checkText() {
    console.log('Chequeando texto');
    this.stats = [];
    this.endpoints.forEach(element => {
      this.procs.push(0);
      this.http.get(`${this.server}${element.route}`,
        {params: {text: this.texto}}).
        subscribe(res => {
          res['name'] = `${element.name} - ${this.count(res['keyScores'])} entidades encontradas`;
          res['color'] = element['color'];
          this.stats.push(res);
          this.procs.pop();
        });
    });
  }
}
