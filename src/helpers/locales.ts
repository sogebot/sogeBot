import { setLocale } from './dayjsHelper.js';

let _lang = 'en';

function setLang(lang: string) {
  _lang = lang;
  setLocale(lang);
}

function getLang() {
  return _lang;
}

export { setLang, getLang };