var Parser = require('../libs/parser')
var Configuration = require('../libs/configuration')
var Commons = require('../libs/commons')
var Database = require('nedb')
var Translate = require('counterpart')
require('../libs/logging')

global.parser = new Parser()
global.configuration = new Configuration()

global.client = {}
global.commons = new Commons()

global.client.action = function (owner, text) {
  console.warn('#WARNING: client.action is deprecated ')
}

global.commons.sendMessage = function (text) {
  global.output.push(text)
}

global.botDB = new Database({
  inMemoryOnly: true,
  autoload: true
})

global.output = []

global.translate = Translate
global.translate.registerTranslations('en', require('../locales/en.json'))
global.translate.setLocale('en')
