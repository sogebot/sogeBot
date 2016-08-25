'use strict'

var glob = require('glob')
var fs = require('fs')
var path = require('path')
var _ = require('lodash')

var translations = {}

function Translate (text) {
  if (typeof text !== 'undefined') return getTranslation(text)
  else {
    return new Promise(function (resolve, reject) {
      glob('./locales/*.json', function (err, files) {
        if (err) reject(err)
        _.each(files, function (file) {
          translations[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(file, 'utf8'))
        })
        resolve(true)
      })
    })
  }
}

function getTranslation (text) {
  return text.split('.').reduce((o, i) => o[i], translations[global.configuration.getValue('lang')])
}

module.exports = Translate
