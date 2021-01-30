'use strict';

import fs from 'fs';

import glob from 'glob';
import _  from 'lodash';
import { getRepository } from 'typeorm';

import { Settings } from './database/entity/settings';
import { Translation } from './database/entity/translation';
import { areDecoratorsLoaded } from './decorators';
import { flatten } from './helpers/flatten';
import { getLang, setLang } from './helpers/locales';
import { error, warning } from './helpers/log';
import { addMenu } from './helpers/panel';

class Translate {
  custom: any[] = [];
  translations: any = {};
  isLoaded = false;

  constructor () {
    addMenu({
      category: 'settings', name: 'translations', id: 'settings/translations', this: null,
    });
  }

  async check(lang: string): Promise<boolean> {
    return typeof this.translations[lang] !== 'undefined';
  }

  async _load () {
    this.custom = await getRepository(Translation).find();
    return new Promise<void>((resolve, reject) => {
      const load = async () => {
        if (!areDecoratorsLoaded) {
          // waiting for full load
          setImmediate(() => load());
          return;
        }

        // we need to manually get if lang is changed so we have proper translations on init
        const lang = await getRepository(Settings).findOne({ namespace: '/core/general', name: 'lang' });
        if (lang) {
          setLang(JSON.parse(lang.value));
        }

        glob('./locales/**', (err, files) => {
          if (err) {
            reject(err);
          }
          for (const f of files) {
            if (!f.endsWith('.json')) {
              continue;
            }
            const withoutLocales = f.replace('./locales/', '').replace('.json', '');
            try {
              _.set(this.translations, withoutLocales.split('/').join('.'), JSON.parse(fs.readFileSync(f, 'utf8')));
            } catch (e) {
              error('Incorrect JSON file: ' + f);
              error(e.stack);
            }
          }

          // dayjs locale include
          for(const key of Object.keys(this.translations)) {
            require('dayjs/locale/' + key);
          }

          for (const c of this.custom) {
            if (_.isNil(flatten(this.translations.en)[c.name])) {
              // remove if lang doesn't exist anymore
              getRepository(Translation).delete({ name: c.name });
              this.custom = _.remove(this.custom, (i) => i.name === c.name);
            }
          }
          this.isLoaded = true;
          resolve();
        });
      };
      load();
    });
  }

  async _save () {
    for (const c of this.custom) {
      await getRepository(Translation).save({
        name:  c.name,
        value: c.value,
      });
      await this._load();
    }
  }

  translate (text: string | { root: string }, orig = false) {
    if (!translate_class.isLoaded) {
      const stack = (new Error('Translations are not yet loaded.')).stack;
      warning(stack);
    }
    if (_.isUndefined(translate_class.translations[getLang()]) && !_.isUndefined(text)) {
      return '{missing_translation: ' + getLang() + '.' + String(text) + '}';
    } else if (typeof text === 'object') {
      const t = _.cloneDeep(translate_class.translations)[getLang()][text.root];
      for (const c of translate_class.custom) {
        t[c.name.replace(`${text.root}.`, '')] = c.value;
      }
      return t;
    } else if (typeof text !== 'undefined') {
      return translate_class.get(text, orig);
    }
    return null;
  }

  get (text: string, orig: string | boolean) {
    try {
      let translated = '';
      const customTranslated = this.custom.find((o) => {
        return o.name === text;
      });
      if (customTranslated && customTranslated.value && !orig) {
        translated = customTranslated.value;
      } else {
        translated = _.get(this.translations[getLang()], String(text), undefined);
      }
      _.each(translated.match(/(\{[\w-.]+\})/g), (toTranslate) => {
        translated = translated.replace(toTranslate, this.get(toTranslate.replace('{', '').replace('}', ''), orig));
      });
      return translated;
    } catch (err) {
      return '{missing_translation: ' + getLang() + '.' + String(text) + '}';
    }
  }
}

const translate_class = new Translate();
const translate = translate_class.translate;
export default translate_class;
export { translate };
