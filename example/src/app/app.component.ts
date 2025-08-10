import { Component } from '@angular/core';
import { ColumnOptions } from 'ngx-spreadsheet';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <div class="gh"></div>
    <h1>
      <img src="favicon.ico" alt="" />
      Lightweight spreadsheet for Angular
    </h1>
    <div class="info">
      <a href="https://www.npmjs.com/package/ngx-spreadsheet">
        <img
          src="https://img.shields.io/npm/v/ngx-spreadsheet.svg"
          alt="npm version"
        />
      </a>
      <a href="https://github.com/e-hirakawa/ngx-spreadsheet/blob/main/LICENSE">
        <img
          src="https://img.shields.io/github/license/e-hirakawa/ngx-spreadsheet.svg"
          alt="license"
        />
      </a>
      <a href="https://github.com/e-hirakawa/ngx-spreadsheet">
        <img
          src="https://img.shields.io/bundlephobia/min/ngx-spreadsheet.svg"
          alt="minified size"
        />
      </a>
      <a href="https://www.npmjs.com/package/ngx-spreadsheet">
        <img
          src="https://img.shields.io/npm/dt/ngx-spreadsheet.svg"
          alt="downloads"
        />
      </a>
    </div>
    <hr />
    <div class="settings">
      <label
        >Rows
        <input
          #inputRows
          type="number"
          [min]="MIN_VALUE"
          [max]="MAX_VALUE"
          [value]="DEFAULT_VALUE"
        />
      </label>
      <label
        >Cols
        <input
          #inputCols
          type="number"
          [min]="MIN_VALUE"
          [max]="MAX_VALUE"
          [value]="DEFAULT_VALUE"
        />
      </label>
      <button (click)="createEmpty(inputRows.value, inputCols.value)">
        Create empty table
      </button>
      <div class="divider"></div>
      <button (click)="createDummy()">Create dummy table</button>
      <button (click)="freeze()">Freeze size</button>
      <button (click)="unfreeze()">Unfreeze size</button>
    </div>
    <ngx-spreadsheet
      [columns]="columns"
      [canInsertCols]="canInsertCols"
      [canInsertRows]="canInsertRows"
      [rows]="rows"
      [cols]="cols"
      [data]="data"
    ></ngx-spreadsheet>
  `,
  styles: [
    'h1 { color: #666; display: inline-flex; align-items: center;}',
    'h1 > img { opacity: 0.6; margin-right: 10px; }',
    '.info { display: flex; gap: 10px; }',
    '.settings { display: flex; gap: 1em; margin: 1em; }',
    'input { min-width: 8em; }',
    '.divider { border-left: 1px solid #ddd; margin-left: 0.5em; padding-right: 0.5em; }',
  ],
})
export class AppComponent {
  readonly MIN_VALUE = 1;
  readonly MAX_VALUE = 999;
  readonly DEFAULT_VALUE = 5;

  data: any;
  rows: number = this.DEFAULT_VALUE;
  cols: number = this.DEFAULT_VALUE;
  canInsertCols: boolean = true;
  canInsertRows: boolean = true;
  columns: ColumnOptions[] = [
    'Product ID',
    'Product Category',
    'Status',
    'Price',
    'Date',
  ].map((v) => ({ header: v }));

  constructor() {
    this.createDummy();
  }

  createEmpty(rowsValue: string, colsValue: string): void {
    this.rows = this.parse(rowsValue);
    this.cols = this.parse(colsValue);
    this.data = null;
  }

  createDummy(): void {
    const category = ['Bag', 'Hat', 'Footwear', 'Wallet', 'Kitchen', 'Outdoor'];
    const status = ['Draft', 'Review', 'Approve', 'Reject', 'Discard'];
    const dummy = [];
    for (let i = 0; i < 15; i++) {
      dummy.push([
        `PID${i}`,
        category[this.random(category.length)],
        status[this.random(status.length)],
        `${this.random(10000)}`,
        new Date().toLocaleString(),
      ]);
    }
    this.data = dummy;
  }

  private parse(value: string): number {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < this.MIN_VALUE || num > this.MAX_VALUE) {
      return this.DEFAULT_VALUE;
    }
    return num;
  }

  private random(max: number): number {
    return Math.floor(Math.random() * max);
  }

  freeze() {
    this.canInsertCols = false;
    this.canInsertRows = false;
  }

  unfreeze() {
    this.canInsertCols = true;
    this.canInsertRows = true;
  }
}
