import 'react-i18next';
import en from './locales/en.json';

// Type-augment react-i18next so `t('key.path')` is statically checked against
// the English source-of-truth JSON. Misspelled keys fail at compile time.
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
