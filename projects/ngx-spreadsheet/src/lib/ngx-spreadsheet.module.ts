import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ContentEditableDirective } from './content-editable.directive';
import { NgxContextMenuItemComponent } from './ngx-context-menu-item.component';
import { NgxContextMenuComponent } from './ngx-context-menu.component';
import { NgxSpreadsheetComponent } from './ngx-spreadsheet.component';
import { LetDirective } from '@ngrx/component';

@NgModule({
  declarations: [
    NgxSpreadsheetComponent,
    NgxContextMenuComponent,
    NgxContextMenuItemComponent,
    ContentEditableDirective,
  ],
  imports: [CommonModule, LetDirective],
  exports: [NgxSpreadsheetComponent],
})
export class NgxSpreadsheetModule {}
