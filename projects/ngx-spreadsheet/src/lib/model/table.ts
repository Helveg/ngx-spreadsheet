import { Cell } from './cell';
import { generateHeader } from '../header-index-generator';
import { generateId } from '../id-generator';

export class Table {
  constructor(
    public id: string,
    public head: string[],
    public body: Cell[][],
  ) {}

  public static empty(rows: number, cols: number): Table {
    const tableId = generateId();
    const row = Array(cols).fill('');
    const head = row.map((v, c) => generateHeader(c + 1));
    const body = [];
    for (let r = 0; r < rows; r++) {
      body.push(row.map((v, c) => new Cell(tableId, r, c, '')));
    }
    return new Table(tableId, head, body);
  }

  public static load(data: string[][]): Table {
    if (!data.length) {
      throw new Error('Error: invalid data structure');
    }
    const tableId = generateId();
    const cols = data.reduce(
      (prev, current) => Math.max(prev, current.length),
      0,
    );
    const head = Array(cols)
      .fill('')
      .map((v, c) => generateHeader(c + 1));
    const body = [];
    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      const bodyRow: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        const value = c < row.length ? row[c] : '';
        bodyRow.push(new Cell(tableId, r, c, value));
      }
      body.push(bodyRow);
    }
    return new Table(tableId, head, body);
  }

  public findCell(row: number, col: number): Cell | null {
    for (const record of this.body) {
      for (const field of record) {
        if (field.row === row && field.col === col) {
          return field;
        }
      }
    }
    return null;
  }

  public findOrCreateCell(row: number, col: number): Cell {
    for (const record of this.body) {
      for (const field of record) {
        if (field.row === row && field.col === col) {
          return field;
        }
      }
    }
    const resize: { rows?: number; cols?: number } = {};
    console.log(this.rowCount, row, this.colCount, col);
    if (this.rowCount <= row) {
      resize.rows = row + 1;
    }
    if (this.colCount <= col) {
      resize.cols = col + 1;
    }
    this.resize(resize);
    const cell = this.findCell(row, col);
    if (!cell) {
      throw new Error(
        `Unknown table error, could not find or create (${row}, ${col})`,
      );
    }
    return cell;
  }

  public insertColumn(colIndex: number): void {
    {
      const remains = this.head.slice(0, colIndex);
      const updates = Array(this.head.length - colIndex + 1)
        .fill('')
        .map((v, c) => generateHeader(c + 1 + colIndex));
      this.head = [...remains, ...updates];
    }
    {
      const body = [];
      for (let r = 0; r < this.body.length; r++) {
        const row = this.body[r];
        const above = row.slice(0, colIndex);
        const present = new Cell(this.id, r, colIndex, '');
        const below = row
          .slice(colIndex)
          .map((cell) => cell.withCol(cell.col + 1));
        const newRow = [...above, present, ...below];
        body.push(newRow);
      }
      this.body = body;
    }
  }

  public deleteColumn(colIndex: number): void {
    {
      const remains = this.head.slice(0, colIndex);
      const updates = this.head
        .slice(colIndex + 1)
        .map((v, c) => generateHeader(c + 1 + colIndex));
      this.head = [...remains, ...updates];
    }
    {
      const body = [];
      for (let r = 0; r < this.body.length; r++) {
        const row = this.body[r];
        const above = row.slice(0, colIndex);
        const below = row
          .slice(colIndex + 1)
          .map((cell) => cell.withCol(cell.col + 1));
        const newRow = [...above, ...below];
        body.push(newRow);
      }
      this.body = body;
    }
  }

  public insertRow(rowIndex: number): void {
    const above = this.body.slice(0, rowIndex);
    const present = Array(this.colCount)
      .fill('')
      .map((v, c) => new Cell(this.id, rowIndex, c, ''));
    const below = this.body
      .slice(rowIndex)
      .map((row) => row.map((cell) => cell.withRow(cell.row + 1)));
    this.body = [...above, present, ...below];
  }

  public deleteRow(rowIndex: number): void {
    const above = this.body.slice(0, rowIndex);
    const below = this.body
      .slice(rowIndex + 1)
      .map((row) => row.map((cell) => cell.withRow(cell.row + 1)));
    this.body = [...above, ...below];
  }

  public get rowCount(): number {
    return this.body.length;
  }

  public get colCount(): number {
    return this.head.length;
  }

  resize({ rows, cols }: { rows?: number; cols?: number }) {
    if (rows !== undefined) {
      while (this.rowCount < rows) {
        this.insertRow(this.rowCount);
      }
    }
    if (cols !== undefined) {
      while (this.colCount < cols) {
        this.insertColumn(this.colCount);
      }
    }
  }
}
