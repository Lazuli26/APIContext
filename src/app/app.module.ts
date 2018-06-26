import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatButtonModule,
  MatInputModule,
  MatCardModule,
  MatCheckboxModule,
  MatTableModule,
  MatGridListModule,
  MatSnackBarModule
  } from '@angular/material';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import { HttpClientModule } from '@angular/common/http';

import {MatTooltipModule} from '@angular/material/tooltip';
import {MatIconModule} from '@angular/material/icon';
@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([
      {'path': '**', component: MainComponent}
    ]),
    FormsModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatCheckboxModule,
    MatTableModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    MatSnackBarModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
