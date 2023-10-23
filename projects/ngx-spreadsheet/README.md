# NgxSmartSpreadsheet
Lightweight spreadsheet module for Angular

[![npm](https://img.shields.io/npm/v/ngx-spreadsheet.svg)](https://www.npmjs.com/package/ngx-spreadsheet)
[![GitHub license](https://img.shields.io/github/license/e-hirakawa/ngx-spreadsheet.svg)](https://github.com/e-hirakawa/ngx-spreadsheet)
[![npm](https://img.shields.io/bundlephobia/min/ngx-spreadsheet.svg)](https://www.npmjs.com/package/ngx-spreadsheet)
[![npm total downloads](https://img.shields.io/npm/dt/ngx-spreadsheet.svg)](https://github.com/e-hirakawa/ngx-spreadsheet)

# DEMO
https://helveg.github.io/ngx-spreadsheet/

# Installation
First, install this module in your project.
```console
$ npm install --save ngx-spreadsheet
```
Import NgxSpreadsheetModule into your module.
```javascript
import { NgxSpreadsheetModule } from 'ngx-spreadsheet';
...

@NgModule({
  ...
  imports: [
    NgxSpreadsheetModule,
    ...
  ],
  ...
})
export class AppModule { }
```

# Usage for initialize
Now you can use the spreadsheet component in your app components, for example in app.component.ts:

## Example: Create an empty table with 3 rows x 6 columns
```js
import { Component } from '@angular/core';
import { SpreadsheetSettings } from 'ngx-spreadsheet';

@Component({
  selector: 'app-root',
  template: `
  <ngx-spreadsheet [settings]="settings">
  </ngx-spreadsheet>
  `
})
export class AppComponent {

  // Spreadsheet initialization: Create an empty table with 3 rows x 6 columns
  settings: SpreadsheetSettings = SpreadsheetSettings.empty(3, 6);

}
```

or

## Example: Read A two-dimensional array
```js
import { Component } from '@angular/core';
import { SpreadsheetSettings } from 'ngx-spreadsheet';

@Component({
  selector: 'app-root',
  template: `
    <ngx-spreadsheet [settings]="settings">
    </ngx-spreadsheet>
  `
})
export class AppComponent {

  // Spreadsheet initialization: Read A two-dimensional array
  settings: SpreadsheetSettings = SpreadsheetSettings.load([
    ['Product ID', 'Product Category', 'Status', 'Price', 'Date'],
    ['PID1', 'Hat', 'Review', '2883', '"2021/8/9 20:25:05"'],
    ['PID2', 'Bag', 'Discard', '7336', '"2021/8/9 20:25:05"']
  ]);

}
```

# Usage for read

```js
import {Component} from '@angular/core';
import {NgxSpreadsheetComponent, SpreadsheetSettings} from 'ngx-spreadsheet';

@Component({
  selector: 'app-root',
  template: `
    <ngx-spreadsheet [settings]="settings">
    </ngx-spreadsheet>
    <button (click)="getData(nss)">Get data</button>
  `
})
export class AppComponent {

  // Spreadsheet initialization: Read A two-dimensional array
  settings: SpreadsheetSettings = SpreadsheetSettings.load([
    ['Product ID', 'Product Category', 'Status', 'Price', 'Date'],
    ['PID1', 'Hat', 'Review', '2883', '"2021/8/9 20:25:05"'],
    ['PID2', 'Bag', 'Discard', '7336', '"2021/8/9 20:25:05"']
  ]);

  getData(nss: NgxSpreadsheetComponent): void {
    console.log(nss.data_);
  }

}
```

# i18n of context menu
```js
import { Component } from '@angular/core';
import { SpreadsheetSettings } from 'ngx-spreadsheet';

@Component({
  selector: 'app-root',
  template: `
    <ngx-spreadsheet [settings]="settings">
    </ngx-spreadsheet>
  `
})
export class AppComponent {

  options: SpreadsheetSettingOptions = {
    contextMenuRowLabel: {
      INSERT_ROW_ABOVE: '上に1行追加',
      INSERT_ROW_BELOW: '下に1行追加',
      DELETE_ROW: '行を削除'
    },
    contextMenuColLabel: {
      INSERT_COLUMN_LEFT: "左に1列追加",
      INSERT_COLUMN_RIGHT: "右に1列追加",
      DELETE_COLUMN: "列を削除",
    }
  };

  // Spreadsheet initialization
  settings: SpreadsheetSettings = SpreadsheetSettings.empty(3, 6, this.options);
  // or 
  // settings: SpreadsheetSettings = SpreadsheetSettings.load([ ... ], this.options);

}
```

