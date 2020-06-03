'use strict';

import glob from 'glob';
import fs from 'fs';
import _  from 'lodash';
import { flatten } from './helpers/flatten';

import { warning } from './helpers/log';
import { getRepository } from 'typeorm';
import { Translation } from './database/entity/translation';
import general from './general';
import { areDecoratorsLoaded } from './decorators';
import { addMenu } from './helpers/panel';

let translate_class: any = null;
let translate: any = null;

class Translate {
  custom: any[] = [];
  translations: any = {};
  lang = 'en';
  isLoaded = false;

  constructor () {
    addMenu({ category: 'settings', name: 'translations', id: 'settings/translations', this: null });
  }

  async _load () {
    this.custom = await getRepository(Translation).find();
    return new Promise(async (resolve, reject) => {
      const load = () => {
        if (!areDecoratorsLoaded) {
          // waiting for full load
          setTimeout(() => load(), 10);
          return;
        }
        this.lang = general.lang;
        glob('./locales/**', (err, files) => {
          if (err) {
            reject(err);
          }
          for (const f of files) {
            if (!f.endsWith('.json')) {
              continue;
            }
            const withoutLocales = f.replace('./locales/', '').replace('.json', '');
            _.set(this.translations, withoutLocales.split('/').join('.'), JSON.parse(fs.readFileSync(f, 'utf8')));
          }
          if (_.isNil(this.translations[this.lang])) {
            warning(`Language ${this.lang} not found - fallback to en`);
            this.lang = 'en';
          }

          for (const c of this.custom) {
            if (_.isNil(flatten(this.translations[this.lang])[c.name])) {
              // remove if lang doesn't exist anymore
              getRepository(Translation).delete({ name: c.name });
              this.custom = _.remove(this.custom, (i) => i.name === c.name);
            }
          }
          this.isLoaded = true; // used for mocha tests
          resolve();
        });
      };
      load();
    });
  }

  async _save () {
    for (const c of this.custom) {
      await getRepository(Translation).save({
        name: c.name,
        value: c.value,
      });
      await this._load();
    }
  }

  translate (text: string | { root: string }, orig = false) {
    if (_.isUndefined(translate_class.translations[translate_class.lang]) && !_.isUndefined(text)) {
      return '{missing_translation: ' + translate_class.lang + '.' + String(text) + '}';
    } else if (typeof text === 'object') {
      const t = translate_class.translations[translate_class.lang][text.root];
      for (const c of translate_class.custom) {
        t[c.name.replace(`${text.root}.`, '')] = c.value;
      }
      return t;
    } else if (typeof text !== 'undefined') {
      return translate_class.get(text, orig);
    }
    return null;
  }

  get (text: string, orig: string) {
    try {
      let translated = '';
      const customTranslated = _.find(this.custom, function (o) {
        return o.name === text;
      });
      if (customTranslated && customTranslated.value && !orig) {
        translated = customTranslated.value;
      } else {
        translated = _.get(this.translations[this.lang], String(text), undefined);
      }
      _.each(translated.match(/(\{[\w-.]+\})/g), (toTranslate) => {
        translated = translated.replace(toTranslate, this.get(toTranslate.replace('{', '').replace('}', ''), orig));
      });
      return translated;
    } catch (err) {
      return '{missing_translation: ' + this.lang + '.' + String(text) + '}';
    }
  }
}

translate_class = new Translate();
translate = translate_class.translate;
export default translate_class;
export { translate };

