export default {
  contextSeparator: '_',
  createOldCatalogs: false,
  defaultNamespace: 'translation',
  defaultValue: (locale, namespace, key, value) => {
    if (value) return value;
    return '';
  },
  indentation: 2,
  keepRemoved: false,
  keyAsDefaultValue: false,
  keyAsDefaultValueForDerivedKeys: false,
  keysSeparator: '.',
  lexers: {
    ts: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t', 'i18n.t'],
      },
    ],
    tsx: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t', 'i18n.t'],
        attr: 'i18nKey',
      },
    ],
    js: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t', 'i18n.t'],
      },
    ],
    jsx: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t', 'i18n.t'],
        attr: 'i18nKey',
      },
    ],
    default: [
      {
        lexer: 'JavascriptLexer',
      },
    ],
  },
  lineEnding: 'auto',
  locales: ['zh-CN', 'en-US'],
  namespaceSeparator: ':',
  output: 'src/i18n/locales/$LOCALE.json',
  pluralSeparator: '_',
  input: ['src/**/*.{ts,tsx,js,jsx}'],
  sort: true,
  verbose: false,
  failOnWarnings: false,
  failOnUpdate: false,
  resetDefaultValueLocale: null,
  i18nextOptions: null,
  yamlOptions: null,
};
