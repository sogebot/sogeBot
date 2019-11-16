'use strict'

require('module-alias/register');

var glob = require('glob')
var fs = require('fs')
var _ = require('lodash')
const { flatten } = require('./helpers/flatten');

import { warning } from './helpers/log';
import { getRepository } from 'typeorm';
import { Translation } from './database/entity/translation';

class Translate {
  custom = [];
  translations = {};

  constructor () {
    global.panel.addMenu({ category: 'settings', name: 'translations', id: 'settings/translations' })
  }

  async _load () {
    this.custom = await getRepository(Translation).find()
    return new Promise(async (resolve, reject) => {
      this.lang = global.general.lang
      glob('./locales/**', (err, files) => {
        if (err) reject(err)
        for (let f of files) {
          if (!f.endsWith('.json')) continue
          let withoutLocales = f.replace('./locales/', '').replace('.json', '')
          _.set(this.translations, withoutLocales.split('/').join('.'), JSON.parse(fs.readFileSync(f, 'utf8')))
        }
        if (_.isNil(this.translations[this.lang])) {
          warning(`Language ${this.lang} not found - fallback to en`)
          this.lang = 'en'
        }

        for (let c of this.custom) {
          if (_.isNil(flatten(this.translations[this.lang])[c.name])) {
            // remove if lang doesn't exist anymore
            getRepository(Translation).delete({ name: c.name })
            this.custom = _.remove(this.custom, (i) => i.name === c.name)
          }
        }
        resolve()
      })
    })
  }

  async _save () {
    const self = global.lib.translate
    for (let c of self.custom) {
      await getRepository(Translation).save({
        name: c.name,
        value: c.value,
      })
      await global.lib.translate._load()
    }
  }

  translate (text, orig) {
    const self = global.lib.translate

    orig = orig || false
    if (_.isUndefined(self.translations[self.lang]) && !_.isUndefined(text)) return '{missing_translation: ' + self.lang + '.' + String(text) + '}'
    else if (typeof text === 'object') {
      let t = self.translations[self.lang][text.root]
      for (let c of self.custom) { t[c.name.replace(`${text.root}.`, '')] = c.value }
      return t
    } else if (typeof text !== 'undefined') return self.get(text, orig)
    return null
  }

  get (text, orig) {
    try {
      const self = global.lib.translate
      var translated
      var customTranslated = _.find(self.custom, function (o) { return o.name === text })
      if (customTranslated && customTranslated.value && !orig) {
        translated = customTranslated.value
      } else {
        translated = _.get(self.translations[self.lang], String(text), undefined)
      }
      _.each(translated.match(/(\{[\w-.]+\})/g), function (toTranslate) { translated = translated.replace(toTranslate, self.get(toTranslate.replace('{', '').replace('}', ''), orig)) })
      return translated
    } catch (err) {
      return '{missing_translation: ' + this.lang + '.' + String(text) + '}'
    }
  }
}

module.exports = Translate
