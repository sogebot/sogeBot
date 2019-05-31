// @flow

'use strict'

var glob = require('glob')
var fs = require('fs')
var _ = require('lodash')
const { flatten } = require('./commons');

const {
  isMainThread,
} = require('worker_threads');
const config = require('@config')
const axios = require('axios')
const chalk = require('chalk')

config.metrics = config.metrics || {}
config.metrics.translations = typeof config.metrics.translations === 'undefined' ? true : config.metrics.translations

class Translate {
  custom: Array<Object> = [];
  translations: Object = {};
  initialMetricsSent: boolean = false;
  mSentMetrics: Array<String> = [];

  constructor () {
    if (isMainThread) global.panel.addMenu({ category: 'settings', name: 'translations', id: 'translations' })
  }

  async _load () {
    this.custom = await global.db.engine.find('customTranslations')
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
          if (isMainThread) global.log.warning(`Language ${this.lang} not found - fallback to en`)
          this.lang = 'en'
        }

        for (let c of this.custom) {
          if (_.isNil(flatten(this.translations[this.lang])[c.key])) {
            // remove if lang doesn't exist anymore
            global.db.engine.remove('customTranslations', { key: c.key })
            this.custom = _.remove(this.custom, (i) => i.key === c.key)
          }
        }

        const version = _.get(process, 'env.npm_package_version', 'n/a')
        if (config.metrics.translations && !this.initialMetricsSent && isMainThread && version !== 'n/a') {
          const bulk = 1000
          let data = { version, items: [] }
          for (let key of [...new Set(Object.keys(flatten(this.translations)).map(o => o.split('.').slice(1).join('.')))]) {
            data.items.push({ key, count: 0, missing: false })
            if (data.items.length === bulk) {
              axios.post('http://stats.sogebot.xyz/add', {
                version: data.version,
                items: data.items
              }).catch(function () {}) // dont expose any errors if something went wrong to not affect bot and confuse
              data.items = []
            }
          }
          // send last data
          if (data.items.length > 0) {
            axios.post('http://stats.sogebot.xyz/add', {
              version: data.version,
              items: data.items
            }).catch(function () {}) // dont expose any errors if something went wrong to not affect bot and confuse
          }
        }

        if (!this.initialMetricsSent && isMainThread) {
          this.initialMetricsSent = true
          global.log.info(`${config.metrics.translations ? chalk.green('ENABLED') : chalk.red('DISABLED')}: Translations (metrics)`)
        }
        resolve()
      })
    })
  }

  async _save () {
    const self = global.lib.translate
    for (let c of self.custom) {
      await global.db.engine.update('customTranslations', { key: c.key }, { key: c.key, value: c.value })
      global.workers.sendToAllWorkers({ type: 'lang' });
      await global.lib.translate._load()
    }
  }

  addMetrics (key: String | Object, ui: Boolean) {
    const version = _.get(process, 'env.npm_package_version', 'n/a')
    if (typeof key === 'object' || version === 'n/a') return // skip objects (returning more than one key)
    if (!isMainThread) {
      // we want to have translations aggregated on master
      return global.workers.sendToMaster({ type: 'call', ns: 'lib.translate', fnc: 'addMetrics', args: [key] })
    }

    if (ui) {
      // we need to search if it is webpanel. or ui.
      // TODO: remove webpanel
      if (!this.get('ui.' + key, false).startsWith('{missing_translation: ')) {
        key = 'ui.' + key
      } else if (!this.get('webpanel.' + key, false).startsWith('{missing_translation: ')) {
        key = 'webpanel.' + key
      }
    }

    if (!this.mSentMetrics.includes(key)) {
      // sent metrics only if its unique
      this.mSentMetrics.push(key)
      axios.post('http://stats.sogebot.xyz/add', {
        version: _.get(process, 'env.npm_package_version', 'n/a'),
        items: [{ key, count: 1, missing: this.get(key, false).startsWith('{missing_translation: ') }]
      }).catch(function () {}) // dont expose any errors if something went wrong to not affect bot and confuse
    }
  }

  translate (text: string | Object, orig: boolean) {
    const self = global.lib.translate

    if (config.metrics.translations) self.addMetrics(text, false)
    orig = orig || false
    if (_.isUndefined(self.translations[self.lang]) && !_.isUndefined(text)) return '{missing_translation: ' + self.lang + '.' + String(text) + '}'
    else if (typeof text === 'object') {
      let t = self.translations[self.lang][text.root]
      for (let c of self.custom) { t[c.key.replace(`${text.root}.`, '')] = c.value }
      return t
    } else if (typeof text !== 'undefined') return self.get(text, orig)
    return null
  }

  get (text: string | Object, orig: boolean) {
    try {
      const self = global.lib.translate
      var translated
      var customTranslated = _.find(self.custom, function (o) { return o.key === text })
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
