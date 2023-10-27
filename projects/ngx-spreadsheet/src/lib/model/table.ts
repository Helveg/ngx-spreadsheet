import { Cell } from './cell';
import { generateHeader } from '../header-index-generator';
import { generateId } from '../id-generator';
import { inject, InjectionToken } from '@angular/core';
import { NSS_DEFAULT_COLS, NSS_DEFAULT_ROWS } from '../providers';
import type { DeepMergeLeafURI } from 'deepmerge-ts';
import { deepmergeCustom } from 'deepmerge-ts';

const noArrayDeepMerge = deepmergeCustom<{
  DeepMergeArraysURI: DeepMergeLeafURI;
}>({
  mergeArrays: false,
});

export interface ColumnOptions {
  header?: string;
  width?: number;
}

export interface TableOptions {
  rows?: number;
  cols?: number;
  data?: any[][];
  columns?: ColumnOptions[];
  canInsertRows?: boolean;
  canInsertCols?: boolean;
}

function getDefault<
  T extends InjectionToken<unknown>,
  K = T extends InjectionToken<infer K> ? K : never,
>(token: T, defaultValue: K): K {
  try {
    return inject<K>(token, { optional: true }) ?? defaultValue;
  } catch (err) {
    console.warn(
      `You are creating a spreadsheet table outside of any injection context. ` +
        `Any configuration you have provided for ${token} can't be retrieved and ` +
        `the default value '${defaultValue}' will be used.`,
    );
  }
  return defaultValue;
}

export class Table {
  private constructor(
    public readonly id: string,
    public head: string[],
    public body: Cell[][],
    public canInsertRows: boolean,
    public canInsertCols: boolean,
    protected options: TableOptions,
  ) {}

  public get data(): any[][] {
    return this.body.map((row) => row.map((cell) => cell.value));
  }

  public recreate(options: TableOptions) {
    return Table.create(noArrayDeepMerge({}, this.options, options));
  }

  public static create(options: TableOptions) {
    options = noArrayDeepMerge({}, options);
    const tableId = generateId();
    const rows =
      options.data?.length ?? options.rows ?? getDefault(NSS_DEFAULT_ROWS, 10);
    const cols =
      options.data?.[0]?.length ??
      options.cols ??
      options.columns?.length ??
      getDefault(NSS_DEFAULT_COLS, 5);
    const emptyRow = Array(cols).fill(undefined);
    const head = emptyRow.map(
      (v, c) => options.columns?.[c]?.header ?? generateHeader(c + 1),
    );
    const body = Array(rows)
      .fill(undefined)
      .map((v, r) =>
        emptyRow.map(
          (v, c) => new Cell(tableId, r, c, options.data?.[r]?.[c] ?? ''),
        ),
      );
    return new Table(
      tableId,
      head,
      body,
      options.canInsertRows ?? true,
      options.canInsertCols ?? true,
      options,
    );
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

  public findOrCreateCell(row: number, col: number): Cell | null {
    for (const record of this.body) {
      for (const field of record) {
        if (field.row === row && field.col === col) {
          return field;
        }
      }
    }
    const resize: { rows?: number; cols?: number } = {};
    if (this.rowCount <= row) {
      if (!this.canInsertRows) return null;
      resize.rows = row + 1;
    }
    if (this.colCount <= col) {
      if (!this.canInsertCols) return null;
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
