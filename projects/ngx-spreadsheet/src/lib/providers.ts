import { InjectionToken } from '@angular/core';

export const NSS_DEFAULT_ROWS = new InjectionToken<number>(
  'NgxSpreadSheetDefaultRows',
);
export const NSS_DEFAULT_COLS = new InjectionToken<number>(
  'NgxSpreadSheetDefaultRows',
);

interface SpreadsheetIntl {}

export const NSS_I18N = new InjectionToken<SpreadsheetIntl>(
  'NgxSpreadSheetInternationalization',
);
