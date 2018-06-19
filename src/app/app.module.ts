import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';


@NgModule({
  declarations: [
    AppComponent,
    MainComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      {'path': '**', component: MainComponent}
    ]),
    FormsModule,
    language
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
