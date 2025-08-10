import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Injector, input, model,
  output,
  Output,
  runInInjectionContext, viewChild,
} from '@angular/core';
import {NgxContextMenuComponent} from './ngx-context-menu.component';
import {merge, Observable} from 'rxjs';
import {distinctUntilChanged, map, scan} from 'rxjs/operators';
import {csvToArray} from './csv-converter';
import {Anchor, Cell, Range, Table} from './model';
import {ColumnOptions, SettableTableOptions} from './model/table';
import {NSS_I18N} from './providers';
import {deepmerge} from 'deepmerge-ts';
import {toObservable} from "@angular/core/rxjs-interop";
import {LetDirective} from "@ngrx/component";
import {ContentEditableDirective} from "./content-editable.directive";
import {NgxContextMenuItemComponent} from "./ngx-context-menu-item.component";

function setPipe<K extends SettableTableOptions>(
  obs$: Observable<Table[K]>,
  attr: K,
) {
  return obs$.pipe(
    map((value: Table[K]) => (table: Table) => {
      table.setOption(attr, value);
      return table;
    }),
  );
}

@Component({
  selector: 'ngx-spreadsheet',
  templateUrl: './ngx-spreadsheet.component.html',
  styleUrls: ['./ngx-spreadsheet.component.scss'],
  imports: [
    LetDirective,
    ContentEditableDirective,
    NgxContextMenuComponent,
    NgxContextMenuItemComponent
  ]
})
export class NgxSpreadsheetComponent {
  private readonly injector = inject(Injector);
  public readonly i18n = deepmerge(
    {
      INSERT_COLUMN_LEFT: 'Insert column left',
      INSERT_COLUMN_RIGHT: 'Insert column right',
      DELETE_COLUMN: 'Delete column',
      DELETE_ROW: 'Delete row',
      INSERT_ROW_BELOW: 'Insert row below',
      INSERT_ROW_ABOVE: 'Insert row above',
    },
    inject(NSS_I18N, {optional: true}) ?? {},
  );
  theadContextMenu = viewChild<NgxContextMenuComponent>('theadMenu');
  tbodyContextMenu = viewChild<NgxContextMenuComponent>('tbodyMenu');

  data = model<any[][]>();
  dataChanged = output<any[][]>();
  rows = model<number>();
  cols = model<number >();
  columns = model<ColumnOptions[] >();
  canInsertCols = model(false);
  canInsertRows = model(false);
  data$ = toObservable(this.data);
  rows$ = toObservable(this.rows);
  cols$ = toObservable(this.cols);
  columns$ = toObservable(this.columns);
  canInsertRows$ = toObservable(this.canInsertRows);
  canInsertCols$ = toObservable(this.canInsertCols);
  /**
   * The table observable integrates all the reactive pipes into a higher order scan that
   * can mutate or replace the table reference.
   */
  table$ = merge(
    setPipe(this.canInsertCols$, 'canInsertCols'),
    setPipe(this.canInsertRows$, 'canInsertRows'),
    // Data object reference changed, create new table based on data
    this.data$.pipe(map((data) => (table: Table) => table.recreate({data}))),
    // Row input changed, resize table
    this.rows$.pipe(map((rows) => (table: Table) => table.resize({rows}))),
    // Col input changed, resize table
    this.cols$.pipe(map((cols) => (table: Table) => table.resize({cols}))),
    // Columns changed, recreate table
    this.columns$.pipe(
      map((columns) => (table: Table) => table.recreate({columns})),
    ),
  ).pipe(
    scan(
      (table, modifier: (table: Table) => Table | void) =>
        (this.table =
          runInInjectionContext(this.injector, () => modifier(table)) ?? table),
      Table.create({}),
    ),
    distinctUntilChanged(),
  );

  @Output() copied = new EventEmitter<string>();

  table: Table | null = null;
  activatedCell: Cell | null = null;
  range: Range | null = null;
  anchor: Anchor | null = null;

  activeTheadIndex: number = -1;
  activeTbodyIndex: number = -1;

  @HostListener('mousedown', ['$event'])
  private onMouseDown(ev: MouseEvent): void {
    const {row, col, valid} = this.getPositionFromId(ev.target);
    if (!valid) {
      return;
    }
    this.range = Range.of(row, col);
    if (!ev.shiftKey || !this.anchor) {
      this.anchor = new Anchor(row, col);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  private onMouseMove(ev: MouseEvent): void {
    if (!this.range || !this.anchor) {
      return;
    }
    const self = this.getPositionFromId(ev.target);
    if (self.valid) {
      const range = Range.marge({r: self.row, c: self.col}, this.anchor);
      if (!this.range?.equals(range)) {
        this.range = range;
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  private onMouseUp(ev: MouseEvent): void {
    if (ev.shiftKey && this.anchor) {
      const self = this.getPositionFromId(ev.target);
      if (self.valid) {
        const range = Range.marge({r: self.row, c: self.col}, this.anchor);
        if (!this.range?.equals(range)) {
          this.range = range;
        }
      }
    }
    this.anchor = null;
  }

  @HostListener('document:keydown', ['$event'])
  private onKeyDown(ev: KeyboardEvent): void {
    const key = ev.key.toLowerCase();
    const isCtrl = (ev.ctrlKey && !ev.metaKey) || (!ev.ctrlKey && ev.metaKey);
    if (!this.table) {
      return;
    }

    if (!this.anchor && ev.shiftKey && this.activatedCell) {
      const {row, col} = this.activatedCell;
      this.anchor = new Anchor(row, col);
    }

    if (key === 'enter' && this.activatedCell) {
      const {row, col, editable} = this.activatedCell;
      ev.preventDefault();
      this.moveTo(row + 1, col, false);
    } else if (key === 'tab' && this.activatedCell) {
      ev.preventDefault();
      const {rowCount, colCount} = this.table;
      const {row, col, editable} = this.activatedCell;
      const next = ev.shiftKey ? col - 1 : col + 1;
      if (next < 0 && row > 0) {
        this.moveTo(row - 1, colCount - 1, false);
      } else if (next >= colCount && row < rowCount) {
        this.moveTo(row + 1, 0, false);
      } else {
        this.moveTo(row, next, false);
      }
    } else if (key === 'f2') {
      this.setEditable(ev, true);
    } else if (key === 'escape') {
      this.setEditable(ev, false);
    } else if (key === 'a' && isCtrl) {
      this.selectAll(ev);
    } else if (key === 'c' && isCtrl) {
      this.copy();
    } else if (key === 'v' && isCtrl) {
      this.paste();
    } else if (key === 'delete') {
      this.delete();
    } else if (
      this.activatedCell &&
      !this.activatedCell.editable &&
      /^.$/u.test(key)
    ) {
      this.activatedCell.value = '';
      this.setEditable(ev, true);
      this.forceFocus(ev.target as HTMLElement);
    }
    this.blockArrowKeys(ev);
  }

  private blockArrowKeys(ev: KeyboardEvent) {
    if (ev.key.toLowerCase().startsWith('arrow')) {
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  @HostListener('document:keyup', ['$event'])
  private onKeyUp(ev: KeyboardEvent): void {
    if (!this.activatedCell || this.activatedCell.editable) {
      return;
    }
    if (!ev.shiftKey) {
      this.anchor = null;
    }
    const {row, col} = this.activatedCell;
    switch (ev.key.toLowerCase()) {
      case 'arrowup':
        this.moveTo(row - 1, col, ev.shiftKey);
        break;
      case 'arrowdown':
        this.moveTo(row + 1, col, ev.shiftKey);
        break;
      case 'arrowleft':
        this.moveTo(row, col - 1, ev.shiftKey);
        break;
      case 'arrowright':
        this.moveTo(row, col + 1, ev.shiftKey);
        break;
    }
    this.blockArrowKeys(ev);
  }

  trackByCell(index: number, value: Cell): string | null {
    return value ? value.id : null;
  }

  clickHeader(colIndex: number): void {
    const rowLength = this.table?.body.length || 0;
    if (rowLength > 0) {
      this.range = Range.of(0, colIndex, rowLength, colIndex);
    }
  }

  clickRow(rowIndex: number): void {
    if (!this.table) {
      return;
    }
    if (rowIndex >= 0 && rowIndex < this.table.body.length) {
      const cols = this.table.body[rowIndex];
      this.range = Range.of(rowIndex, 0, rowIndex, cols.length);
    }
  }

  focus(ev: FocusEvent): void {
    const found = this.findCellByEventTarget(ev.target);
    this.activatedCell = found;
  }

  blur(ev: FocusEvent): void {
    const found = this.findCellByEventTarget(ev.target);
    if (found) {
      found.editable = false;
    }
  }

  cellMouseUp(ev: Event, target: Cell): void {
    const td = ev.target as HTMLTableCellElement;
    if (target === this.activatedCell) {
      target.editable = true;
    }
  }

  setValue(ev: Event, target: Cell): void {
    const value = (ev.target as HTMLTableCellElement).innerText || '';
    target.value = value;
  }

  setEditable(ev: Event, editable: boolean): void {
    ev.stopPropagation();
    const found = this.findCellByEventTarget(ev.target);
    if (found) {
      found.editable = editable;
    }
  }

  showTheadMenu(ev: MouseEvent, index: number) {
    ev.stopPropagation();
    this.theadContextMenu()?.show(ev, index);
    // Return false to prevent the browser from opening its own context menu on top
    return false;
  }

  showTbodyMenu(ev: MouseEvent, index: number) {
    ev.stopPropagation();
    this.tbodyContextMenu()?.show(ev, index);
    // Return false to prevent the browser from opening its own context menu on top
    return false;
  }

  private moveTo(row: number, col: number, shiftKey: boolean): void {
    if (!this.table) {
      return;
    }
    const {rowCount, colCount} = this.table;
    const resize: { rows?: number; cols?: number } = {};
    if (rowCount <= row && this.table.canInsertRows) {
      resize.rows = row + 1;
    }
    if (colCount <= col && this.table.canInsertCols) {
      resize.cols = col + 1;
    }
    this.table.resize(resize);
    const {body} = this.table;
    if (row >= 0 && row < body.length) {
      const cols = body[row];
      if (col >= 0 && col < cols.length) {
        const cell = cols[col];
        setTimeout(() => {
          const e = document.getElementById(cell.id);
          if (e) {
            this.forceFocus(e);
          }
        });
        if (shiftKey && this.range && this.anchor) {
          this.range = Range.marge(this.anchor, {r: row, c: col});
        } else {
          this.range = Range.of(cell.row, cell.col);
        }
      }
    }
  }

  private forceFocus(el: HTMLElement) {
    el.focus();
    const s = window.getSelection();
    const r = document.createRange();
    r.setStart(el, el.childElementCount);
    r.setEnd(el, el.childElementCount);
    s?.removeAllRanges();
    s?.addRange(r);
  }

  private findCellByEventTarget(target: EventTarget | null): Cell | null {
    const {row, col, valid} = this.getPositionFromId(target);
    return valid ? this.table?.findCell(row, col) || null : null;
  }

  private getPositionFromId(target: EventTarget | null): {
    row: number;
    col: number;
    valid: boolean;
  } {
    const element = target as HTMLTableCellElement;
    if (!this.table || !element?.id?.match(/(\w+)-(\d+)-(\d+)/)) {
      return {row: NaN, col: NaN, valid: false};
    }
    const valid = RegExp.$1 === this.table.id;
    const row = parseInt(RegExp.$2 || '', 10);
    const col = parseInt(RegExp.$3 || '', 10);
    return {row, col, valid};
  }

  private copy(): void {
    if (!this.table || !this.range) {
      return;
    }
    const lines = [];
    for (let r = this.range.r1; r <= this.range.r2; r++) {
      const line = [];
      for (let c = this.range.c1; c <= this.range.c2; c++) {
        const cell = this.table.findCell(r, c);
        if (cell) {
          const value = cell.value.match(/[\t\n\r　 "]+/)
            ? '"' + cell.value.split('"').join('""') + '"'
            : cell.value;
          line.push(value);
        }
      }
      lines.push(line.join('\t'));
    }
    const text = lines.join('\n');
    if (text) {
      navigator.clipboard.writeText(text).then(() => this.copied.emit(text));
    }
  }

  private paste(): void {
    if (!this.table || !this.range) {
      return;
    }
    const {r1, c1, r2, c2} = this.range;
    navigator.clipboard.readText().then((data) => {
      const ar = csvToArray(data);
      if (!ar.length) {
        return;
      }
      if (ar.length === 1 && ar[0].length === 1) {
        // There is only 1 pasted value, paste it everywhere
        const clipboardText = ar[0][0];
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            const cell = this.table!.findCell(r, c);
            if (cell) {
              cell.value = clipboardText;
            }
          }
        }
      } else {
        let mr: number = 0,
          mc: number = 0;
        for (let r = 0, tableRow = r1; r < ar.length; r++, tableRow++) {
          const row = ar[r];
          for (let c = 0, tableCol = c1; c < row.length; c++, tableCol++) {
            const col = row[c];
            const cell = this.table!.findOrCreateCell(tableRow, tableCol);
            if (cell) {
              cell.value = col;
              mr = Math.max(cell.row, mr);
              mc = Math.max(cell.col, mc);
            }
          }
        }
        this.range = Range.of(r1, c1, mr, mc);
      }
    });
    this.dataChanged.emit(this.table.data);
  }

  private delete(): void {
    if (!this.table || !this.range) {
      return;
    }
    const {r1, c1, r2, c2} = this.range;
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = this.table.findCell(r, c);
        if (cell) {
          cell.value = '';
        }
      }
    }
    this.dataChanged.emit(this.table.data);
  }

  updateValue(table: Table, cell: any, $event: string) {
    if (cell.value != $event) {
      cell.value = $event;
      this.dataChanged.emit(table.data);
    }
  }

  selectAll(event$?: Event) {
    if (!this.table || this.table.editing) {
      return;
    }
    this.range = Range.of(0, 0, this.table.rowCount, this.table.colCount);
    if (event$) {
      event$.stopPropagation();
      event$.preventDefault();
    }
  }

  newRow(col: number) {
    if (!this.table) return;
    this.table.resize({rows: this.table.rowCount + 1});
    this.activatedCell = this.table.findCell(this.table.rowCount - 1, col);
    this.range = new Range(
      this.table.rowCount - 1,
      col,
      this.table.rowCount - 1,
      col,
    );
    setTimeout(() => {
      if (this.activatedCell) {
        const el = document.getElementById(this.activatedCell.id);
        if (el) {
          this.forceFocus(el);
        }
      }
    });
  }
}
