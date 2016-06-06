var Parser = require('../libs/parser')
var Configuration = require('../libs/configuration')
var Commons = require('../libs/commons')
var Database = require('nedb')
var Translate = require('counterpart')

global.parser = new Parser()
global.configuration = new Configuration()

global.client = {}
global.commons = new Commons()

global.client.action = function (owner, text) {
  console.warn('#WARNING: client.action is deprecated ')
}

global.botDB = new Database({
  inMemoryOnly: true,
  autoload: true
})

global.translate = Translate
global.translate.registerTranslations('en', require('../locales/en.json'))
global.translate.setLocale('en')
