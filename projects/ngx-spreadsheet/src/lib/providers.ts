import { InjectionToken } from '@angular/core';

export const NSS_DEFAULT_ROWS = new InjectionToken<number>(
  'NgxSpreadSheetDefaultRows',
);
export const NSS_DEFAULT_COLS = new InjectionToken<number>(
  'NgxSpreadSheetDefaultRows',
);

export interface SpreadsheetIntl {
  INSERT_COLUMN_LEFT: string;
  INSERT_COLUMN_RIGHT: string;
  DELETE_COLUMN: string;
  DELETE_ROW: string;
  INSERT_ROW_BELOW: string;
  INSERT_ROW_ABOVE: string;
}

export const NSS_I18N = new InjectionToken<SpreadsheetIntl>(
  'NgxSpreadSheetInternationalization',
);
