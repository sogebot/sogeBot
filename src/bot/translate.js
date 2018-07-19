'use strict'

var glob = require('glob')
var fs = require('fs')
var _ = require('lodash')
const flatten = require('flat')

const cluster = require('cluster')

class Translate {
  constructor () {
    this.custom = []
    this.translations = {}

    this.lang = 'en'
    global.configuration.register('lang', '', 'string', this.lang)

    if (cluster.isMaster) global.panel.addMenu({category: 'settings', name: 'translations', id: 'translations'})
  }

  async _load () {
    this.custom = await global.db.engine.find('customTranslations')
    return new Promise(async (resolve, reject) => {
      this.lang = await global.configuration.getValue('lang')
      glob('./locales/**', (err, files) => {
        if (err) reject(err)
        for (let f of files) {
          if (!f.endsWith('.json')) continue
          let withoutLocales = f.replace('./locales/', '').replace('.json', '')
          _.set(this.translations, withoutLocales.split('/').join('.'), JSON.parse(fs.readFileSync(f, 'utf8')))
        }
        if (_.isNil(this.translations[this.lang])) {
          if (cluster.isMaster) global.log.warning(`Language ${this.lang} not found - fallback to en`)
          this.lang = 'en'
        }
        for (let c of this.custom) {
          if (_.isNil(flatten(this.translations[this.lang])[c.key])) {
            // remove if lang doesn't exist anymore
            global.db.engine.remove('customTranslations', { key: c.key })
            this.custom = _.remove(this.custom, (i) => i.key === c.key)
          }
        }
        resolve()
      })
    })
  }

  async _save () {
    const self = global.lib.translate
    for (let c of self.custom) {
      await global.db.engine.update('customTranslations', { key: c.key }, { key: c.key, value: c.value })
      for (let worker in cluster.workers) cluster.workers[worker].send({ type: 'lang' })
      await global.lib.translate._load()
    }
  }

  translate (text, orig) {
    orig = orig || false
    const self = global.lib.translate
    if (_.isUndefined(self.translations[self.lang]) && !_.isUndefined(text)) return '{missing_translation: ' + self.lang + '.' + text + '}'
    else if (typeof text === 'object') {
      let t = self.translations[self.lang][text.root]
      for (let c of self.custom) { t[c.key.replace(`${text.root}.`, '')] = c.value }
      return t
    } else if (typeof text !== 'undefined') return self.get(text, orig)
    return null
  }

  get (text, orig) {
    try {
      const self = global.lib.translate
      var translated
      var customTranslated = _.find(self.custom, function (o) { return o.key === text })
      if (!_.isNil(customTranslated) && !orig) {
        translated = customTranslated.value
      } else {
        translated = text.split('.').reduce((o, i) => o[i], self.translations[self.lang])
      }
      _.each(translated.match(/(\{[\w-.]+\})/g), function (toTranslate) { translated = translated.replace(toTranslate, self.get(toTranslate.replace('{', '').replace('}', ''), orig)) })
      return translated
    } catch (err) {
      return '{missing_translation: ' + this.lang + '.' + text + '}'
    }
  }
}

module.exports = Translate
