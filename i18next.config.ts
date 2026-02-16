import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['zh-CN', 'en-US'],
  extract: {
    input: ['src/**/*.{js,jsx,ts,tsx}'],
    output: 'src/i18n/locales/{{language}}.json',
    defaultNS: false,
    nsSeparator: false,
    keySeparator: '.',
    defaultValue: (locale, key) => {
      if (locale === 'zh-CN') {
        return key;
      }
      return '';
    },
  },
});
