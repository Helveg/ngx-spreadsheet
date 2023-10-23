import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxSpreadsheetModule } from 'ngx-spreadsheet';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [CommonModule, BrowserModule, NgxSpreadsheetModule],
  exports: [NgxSpreadsheetModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
