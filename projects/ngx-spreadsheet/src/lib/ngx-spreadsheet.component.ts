import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Injector,
  Input,
  Output,
  runInInjectionContext,
  ViewChild,
} from '@angular/core';
import { NgxContextMenuComponent } from './ngx-context-menu.component';
import { Subjectize } from 'subjectize';
import { merge, ReplaySubject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  scan,
  withLatestFrom,
} from 'rxjs/operators';
import { csvToArray } from './csv-converter';
import { Anchor, Cell, Range, Table } from './model';
import { ColumnOptions } from './model/table';

@Component({
  selector: 'ngx-spreadsheet',
  templateUrl: './ngx-spreadsheet.component.html',
  styleUrls: ['./ngx-spreadsheet.component.scss'],
})
export class NgxSpreadsheetComponent {
  private readonly injector = inject(Injector);
  @ViewChild('theadMenu')
  theadContextMenu!: NgxContextMenuComponent;
  @ViewChild('tbodyMenu')
  tbodyContextMenu!: NgxContextMenuComponent;

  @Input() data: any[][] | null = null;
  @Input() rows: number | null = null;
  @Input() cols: number | null = null;
  @Input() columns: ColumnOptions[] | null = null;
  @Subjectize('data') data$ = new ReplaySubject<any[][]>(1);
  @Subjectize('rows') rows$ = new ReplaySubject<number>(1);
  @Subjectize('cols') cols$ = new ReplaySubject<number>(1);
  @Subjectize('columns') columns$ = new ReplaySubject<ColumnOptions[]>(1);
  /**
   * The table observable integrates all the reactive pipes into a higher order scan that
   * can mutate or replace the table reference.
   */
  table$ = merge(
    // Data object reference changed, create new table based on data
    this.data$.pipe(map((data) => (table: Table) => table.recreate({ data }))),
    // Row input changed, resize table
    this.rows$.pipe(map((rows) => (table: Table) => table.resize({ rows }))),
    // Col input changed, resize table
    this.cols$.pipe(map((cols) => (table: Table) => table.resize({ cols }))),
    // Columns changed, recreate table
    this.columns$.pipe(
      map((columns) => (table: Table) => table.recreate({ columns })),
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

  @Output()
  copied = new EventEmitter<string>();

  table: Table | null = null;
  activatedCell: Cell | null = null;
  range: Range | null = null;
  anchor: Anchor | null = null;

  activeTheadIndex: number = -1;
  activeTbodyIndex: number = -1;

  @HostListener('mousedown', ['$event'])
  private mousedown(ev: MouseEvent): void {
    const { row, col, valid } = this.getPositionFromId(ev.target);
    if (!valid) {
      return;
    }
    this.range = Range.of(row, col);
    if (!ev.shiftKey || !this.anchor) {
      this.anchor = new Anchor(row, col);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  private mousemove(ev: MouseEvent): void {
    if (!this.range || !this.anchor) {
      return;
    }
    const self = this.getPositionFromId(ev.target);
    if (self.valid) {
      const range = Range.marge({ r: self.row, c: self.col }, this.anchor);
      if (!this.range?.equals(range)) {
        this.range = range;
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  private mouseup(ev: MouseEvent): void {
    if (ev.shiftKey && this.anchor) {
      const self = this.getPositionFromId(ev.target);
      if (self.valid) {
        const range = Range.marge({ r: self.row, c: self.col }, this.anchor);
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
      const { row, col } = this.activatedCell;
      this.anchor = new Anchor(row, col);
    }

    if (key === 'enter' && this.activatedCell) {
      const { row, col, editable } = this.activatedCell;
      if (editable && ev.shiftKey) {
        ev.preventDefault();
        this.moveTo(row + 1, col, false, editable);
      }
    } else if (key === 'tab' && this.activatedCell) {
      ev.preventDefault();
      const { rowCount, colCount } = this.table;
      const { row, col, editable } = this.activatedCell;
      const next = ev.shiftKey ? col - 1 : col + 1;
      if (next < 0 && row > 0) {
        this.moveTo(row - 1, colCount - 1, false, editable);
      } else if (next >= colCount && row < rowCount) {
        this.moveTo(row + 1, 0, false, editable);
      } else {
        this.moveTo(row, next, false, editable);
      }
    } else if (key === 'f2') {
      this.setEditable(ev, true);
    } else if (key === 'escape') {
      this.setEditable(ev, false);
    } else if (key === 'c' && isCtrl) {
      this.copy();
    } else if (key === 'v' && isCtrl) {
      this.paste();
    } else if (key === 'delete') {
      this.delete();
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
    const { row, col } = this.activatedCell;
    switch (ev.key.toLowerCase()) {
      case 'arrowup':
        this.moveTo(row - 1, col, ev.shiftKey, false);
        break;
      case 'arrowdown':
        this.moveTo(row + 1, col, ev.shiftKey, false);
        break;
      case 'arrowleft':
        this.moveTo(row, col - 1, ev.shiftKey, false);
        break;
      case 'arrowright':
        this.moveTo(row, col + 1, ev.shiftKey, false);
        break;
    }
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

  dblclick(ev: Event, target: Cell): void {
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
    this.theadContextMenu.show(ev, index);
    // Return false to prevent browser from opening its own context menu on top
    return false;
  }

  showTbodyMenu(ev: MouseEvent, index: number) {
    ev.stopPropagation();
    this.tbodyContextMenu.show(ev, index);
    // Return false to prevent browser from opening its own context menu on top
    return false;
  }

  //#endregion

  private moveTo(
    row: number,
    col: number,
    shiftKey: boolean,
    editable: boolean,
  ): void {
    if (!this.table) {
      return;
    }
    const { body } = this.table;
    if (row >= 0 && row < body.length) {
      const cols = body[row];
      if (col >= 0 && col < cols.length) {
        const cell = cols[col];
        const e = document.getElementById(cell.id);
        if (e) {
          e.focus();
          const s = window.getSelection();
          const r = document.createRange();
          r.setStart(e, e.childElementCount);
          r.setEnd(e, e.childElementCount);
          s?.removeAllRanges();
          s?.addRange(r);
        }
        if (shiftKey && this.range && this.anchor) {
          this.range = Range.marge(this.anchor, { r: row, c: col });
        } else {
          this.range = Range.of(cell.row, cell.col);
        }
        if (editable) {
          cell.editable = true;
        }
      }
    }
  }

  private findCellByEventTarget(target: EventTarget | null): Cell | null {
    const { row, col, valid } = this.getPositionFromId(target);
    return valid ? this.table?.findCell(row, col) || null : null;
  }

  private getPositionFromId(target: EventTarget | null): {
    row: number;
    col: number;
    valid: boolean;
  } {
    const element = target as HTMLTableCellElement;
    if (!this.table || !element?.id?.match(/(\w+)-(\d+)-(\d+)/)) {
      return { row: NaN, col: NaN, valid: false };
    }
    const valid = RegExp.$1 === this.table.id;
    const row = parseInt(RegExp.$2 || '', 10);
    const col = parseInt(RegExp.$3 || '', 10);
    return { row, col, valid };
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
    const { r1, c1, r2, c2 } = this.range;
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
  }

  private delete(): void {
    if (!this.table || !this.range) {
      return;
    }
    const { r1, c1, r2, c2 } = this.range;
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = this.table.findCell(r, c);
        if (cell) {
          cell.value = '';
        }
      }
    }
  }
}
