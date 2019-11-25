'use strict';

require('module-alias/register');

import glob from 'glob';
import fs from 'fs';
import _  from 'lodash';
import { flatten } from './helpers/flatten';

import { warning } from './helpers/log';
import { getRepository } from 'typeorm';
import { Translation } from './database/entity/translation';
import panel from './panel';

class Translate {
  custom: any[] = [];
  translations: any = {};
  lang = 'en';

  constructor () {
    panel.addMenu({ category: 'settings', name: 'translations', id: 'settings/translations' });
  }

  async _load () {
    this.custom = await getRepository(Translation).find();
    return new Promise(async (resolve, reject) => {
      this.lang = global.general.lang;
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
        resolve();
      });
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

  translate (text, orig = false) {
    if (_.isUndefined(this.translations[this.lang]) && !_.isUndefined(text)) {
      return '{missing_translation: ' + this.lang + '.' + String(text) + '}';
    } else if (typeof text === 'object') {
      const t = this.translations[this.lang][text.root];
      for (const c of this.custom) {
        t[c.name.replace(`${text.root}.`, '')] = c.value;
      }
      return t;
    } else if (typeof text !== 'undefined') {
      return this.get(text, orig);
    }
    return null;
  }

  get (text, orig) {
    try {
      let translated;
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

const translate_class = new Translate();
const translate = translate_class.translate;
export default translate_class;
export { translate };

