import { Component, OnInit } from '@angular/core';
import { API_KEYS } from './../../API_KEYS';
// Las puntuaciones deben ir de -1 (negativo) a 1 (positiva), siendo 0 una puntuación neutral
interface NLPRES {
  score: Number;
  keyWords: String[];
  keyScores: {key: String, value: Number};
}
class NLP {
  constructor() {}
  google(text) {
    const keyScores = <{key: String, value: Number}> {};
    const keyWords = <String[]> [];
    const score = <Number> 0;
    return <NLPRES> {score: score, keyWords: keyWords, keyScores: keyScores};
  }
}
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  private texto = '';
  private score = 0;
  private keyWords = [];
  private keyScores = [];
  constructor() { }

  ngOnInit() {
  }

}
