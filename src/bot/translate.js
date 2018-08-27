// @flow

'use strict'

var glob = require('glob')
var fs = require('fs')
var _ = require('lodash')
const flatten = require('flat')

const cluster = require('cluster')
const config = require('@config')
const axios = require('axios')
const chalk = require('chalk')

config.metrics = config.metrics || {}
config.metrics.translations = typeof config.metrics.translations === 'undefined' ? true : config.metrics.translations

class Translate {
  custom: Array<Object> = [];
  translations: Object = {};
  initialMetricsSent: boolean = false;
  mItems: Array<Object> = [];
  mTimestamp: Date = new Date();
  lang: string = 'en';

  constructor () {
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

        if (config.metrics.translations && !this.initialMetricsSent && cluster.isMaster) {
          const bulk = 1000
          let data = { version: _.get(process, 'env.npm_package_version', 'n/a'), items: [] }
          for (let key of [...new Set(Object.keys(flatten(this.translations)).map(o => o.split('.').slice(1).join('.')))]) {
            data.items.push({key, count: 0})
            if (data.items.length === bulk) {
              axios.post('http://stats.sogehige.tv/add', {
                version: data.version,
                items: data.items
              })
              data.items = []
            }
          }
          // send last data
          if (data.items.length > 0) {
            axios.post('http://stats.sogehige.tv/add', {
              version: data.version,
              items: data.items
            })
          }
        }

        if (!this.initialMetricsSent && cluster.isMaster) {
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
      for (let worker in cluster.workers) cluster.workers[worker].send({ type: 'lang' })
      await global.lib.translate._load()
    }
  }

  addMetrics (key: string | Object) {
    if (typeof key === 'object') return // skip objects (returning more than one key)
    if (cluster.isWorker) {
      // we want to have translations aggregated on master
      if (process.send) return process.send({ type: 'call', ns: 'lib.translate', fnc: 'addMetrics', args: [key] })
      return false
    }

    this.mItems.push({key, count: 1})

    if (this.mItems.length > 100 || new Date().getTime() - new Date(this.mTimestamp).getTime() > 1000 * 60 * 30) {
      axios.post('http://stats.sogehige.tv/add', {
        version: _.get(process, 'env.npm_package_version', 'n/a'),
        items: _(_.clone(this.mItems)).groupBy('key').map((o, k) => ({
          key: k,
          count: _.sumBy(o, 'count')
        })).value()
      })

      this.mTimestamp = new Date()
      this.mItems = []
    }
  }

  translate (text: string | Object, orig: boolean) {
    const self = global.lib.translate

    if (config.metrics.translations) self.addMetrics(text)
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
