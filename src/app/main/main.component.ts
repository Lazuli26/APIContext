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
  displayedColumns = ['sujeto', 'puntuacion'];
  private stats = [];
  constructor(private http: HttpClient) { }

  ngOnInit() {
  }
  checkText() {
    console.log('Chequeando texto');
    this.stats = [];
    this.http.get('http://localhost:8081/IBMWatson',
      {params: {text: this.texto}}).
      subscribe(res => {
        res['name'] = 'Watson';
        this.stats.push(res);
        console.log(res);
      });
  }
}
