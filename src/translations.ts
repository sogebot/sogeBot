import fs from 'fs';
import { normalize } from 'path';

import { glob } from 'glob';
import { set, isNil, remove, isUndefined, cloneDeep, each, get } from 'lodash-es';

import { Delete, Get, Post } from './decorators/endpoint.js';
import { onStartup } from './decorators/on.js';
import { areDecoratorsLoaded } from './decorators.js';

import Core from '~/_interface.js';
import { Settings } from '~/database/entity/settings.js';
import { Translation } from '~/database/entity/translation.js';
import { AppDataSource } from '~/database.js';
import { flatten } from '~/helpers/flatten.js';
import { getLang, setLang } from '~/helpers/locales.js';
import { error, warning } from '~/helpers/log.js';
import { addMenu } from '~/helpers/panel.js';

class Translations extends Core {
  custom: any[] = [];
  translations: any = {};
  isLoaded = false;

  @onStartup()
  onStartup () {
    addMenu({
      category: 'settings', name: 'translations', id: 'settings/translations', this: null, scopeParent: this.scope(),
    });
  }

  @Get('/', {
    scope: 'public',
  })
  async getTranslations () {
    const responses = flatten(this.translations[getLang()]);
    for (const key of Object.keys(responses)) {
      const value = {
        default: this.translate(key, true),
        current: this.translate(key),
      };
      responses[key] = value;
    }
    return responses;
  }

  @Post('/:key')
  async setTranslations(req: any) {
    const key = req.params.key;
    const data = req.body;

    remove(this.custom, function (o: any) {
      return o.key === key;
    });
    this.custom.push(data);
    await this._save();
  }

  @Delete('/:key')
  async revertTranslations(req: any) {
    remove(this.custom, function (o: any) {
      return o.name === req.params.key;
    });
    await AppDataSource.getRepository(Translation).delete({ name: req.params.key });
  }

  async check(lang: string): Promise<boolean> {
    return typeof this.translations[lang] !== 'undefined';
  }

  async _load () {
    this.custom = await AppDataSource.getRepository(Translation).find();
    return new Promise<void>((resolve, reject) => {
      const load = async () => {
        if (!areDecoratorsLoaded) {
          // waiting for full load
          setImmediate(() => load());
          return;
        }

        // we need to manually get if lang is changed so we have proper translations on init
        const lang = await AppDataSource.getRepository(Settings).findOneBy({ namespace: '/core/general', name: 'lang' });
        if (lang) {
          setLang(JSON.parse(lang.value));
        }

        glob('./locales/**').then((files) => {
          for (const f of files) {
            if (!f.endsWith('.json')) {
              continue;
            }
            const withoutLocales = normalize(f).replace(/\\/g, '/').replace('locales/', '').replace('.json', '');
            try {
              set(this.translations, withoutLocales.split('/').join('.'), JSON.parse(fs.readFileSync(f, 'utf8')));
            } catch (e: any) {
              error('Incorrect JSON file: ' + f);
              error(e.stack);
            }
          }

          // dayjs locale include
          for(const key of Object.keys(this.translations)) {
            import(`dayjs/locale/${key}.js`);
          }

          for (const c of this.custom) {
            if (isNil(flatten(this.translations.en)[c.name])) {
              // remove if lang doesn't exist anymore
              AppDataSource.getRepository(Translation).delete({ name: c.name });
              this.custom = remove(this.custom, (i) => i.name === c.name);
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
      await AppDataSource.getRepository(Translation).save({
        name:  c.name,
        value: c.value,
      });
      await this._load();
    }
  }

  translate (text: string | { root: string }, orig = false): any {
    if (!translate_class.isLoaded) {
      const stack = (new Error('Translations are not yet loaded.')).stack;
      warning(stack);
    }
    if (isUndefined(translate_class.translations[getLang()]) && !isUndefined(text)) {
      return '{missing_translation: ' + getLang() + '.' + String(text) + '}';
    } else if (typeof text === 'object') {
      const t = cloneDeep(translate_class.translations)[getLang()][text.root];
      for (const c of translate_class.custom) {
        t[c.name.replace(`${text.root}.`, '')] = c.value;
      }
      return t;
    } else if (typeof text !== 'undefined') {
      return translate_class.get(text, orig);
    }
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
        translated = get(this.translations[getLang()], String(text), undefined);
      }
      // translate {something} but not {{something}}
      each(translated.match(/(?<!\{)\{[\w-.]+\}(?!\})/g), (toTranslate) => {
        translated = translated.replace(toTranslate, this.get(toTranslate.replace('{', '').replace('}', ''), orig));
      });
      // replace {{something}} to {something}
      translated = translated.replace(/\{\{([\w-.]+)\}\}/g, '{$1}');
      return translated;
    } catch (err: any) {
      return '{missing_translation: ' + getLang() + '.' + String(text) + '}';
    }
  }
}

const translate_class = new Translations();
const translate = translate_class.translate;
export default translate_class;
export { translate };
