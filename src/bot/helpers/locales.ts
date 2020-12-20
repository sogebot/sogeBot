let _lang = 'en';

function setLang(lang: string) {
  _lang = lang;
}

function getLang() {
  return _lang;
}

export { setLang, getLang };