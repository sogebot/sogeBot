'use strict'

var glob = require('glob')
var fs = require('fs')
var path = require('path')
var _ = require('lodash')
const flatten = require('flat')

class Translate {
  constructor () {
    this.custom = {}
    this.translations = {}

    global.panel.addMenu({category: 'settings', name: 'translations', id: 'translations'})
  }

  async _load () {
    this.custom = await global.db.engine.find('customTranslations')
    return new Promise((resolve, reject) => {
      glob('./locales/*.json', (err, files) => {
        if (err) reject(err)
        for (let f of files) {
          this.translations[path.basename(f, '.json')] = JSON.parse(fs.readFileSync(f, 'utf8'))
        }

        for (let c of this.custom) {
          if (_.isNil(flatten(this.translations[global.configuration.getValue('lang')])[c.key])) {
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
      global.db.engine.update('customTranslations', { key: c.key }, { key: c.key, value: c.value })
    }
  }

  translate (text, orig) {
    orig = orig || false
    const self = global.lib.translate
    if (_.isUndefined(self.translations[global.configuration.getValue('lang')]) && !_.isUndefined(text)) return '{missing_translation: ' + global.configuration.getValue('lang') + '.' + text + '}'
    else if (typeof text === 'object') {
      let t = self.translations[global.configuration.getValue('lang')][text.root]
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
        translated = text.split('.').reduce((o, i) => o[i], self.translations[global.configuration.getValue('lang')])
      }
      _.each(translated.match(/(\{[\w-.]+\})/g), function (toTranslate) { translated = translated.replace(toTranslate, self.get(toTranslate.replace('{', '').replace('}', ''), orig)) })
      return translated
    } catch (err) {
      return '{missing_translation: ' + global.configuration.getValue('lang') + '.' + text + '}'
    }
  }
}

module.exports = Translate
