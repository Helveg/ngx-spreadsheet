import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import {NgxSpreadsheetComponent} from "../../../projects/ngx-spreadsheet/src/lib/ngx-spreadsheet.component";

@NgModule({
  declarations: [AppComponent],
  imports: [CommonModule, BrowserModule, NgxSpreadsheetComponent],
  exports: [NgxSpreadsheetComponent],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
