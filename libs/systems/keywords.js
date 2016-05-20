'use strict'

var chalk = require('chalk')
var constants = require('../constants')

function Keywords () {
  if (global.configuration.get().systems.keywords === true) {
    global.parser.register(this, '!keyword add', this.addKeyword, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword list', this.listKeywords, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword remove', this.delKeyword, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword', this.help, constants.OWNER_ONLY)

    global.parser.registerParser('keywords', this.customKeyword, constants.VIEWERS)
  }

  console.log('Keywords system loaded and ' + (global.configuration.get().systems.keywords === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Keywords.prototype.help = function () {
  var text = 'Usage: !keyword add <keyword> <response> | !keyword remove <keyword> | !keyword list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

Keywords.prototype.addKeyword = function (self, sender, keyword) {
  if (keyword.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Keyword error: Cannot add empty keyword')
    return
  }

  // check if response after keyword is set
  if (keyword.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Keyword error: Cannot add keyword without response')
    return
  }

  var kw = keyword.split(' ')[0]
  var response = keyword.replace(kw, '').trim()

  var data = {_type: 'keywords', _keyword: kw, response: response, success: 'Keyword was succesfully added', error: 'Sorry, ' + sender + ', this keyword already exists.'}
  global.commons.insertIfNotExists(data)
}

Keywords.prototype.customKeyword = function (id, user, msg) {
  if (msg.startsWith('!')) {
    global.updateQueue(id, true) // don't want to parse commands
    return true
  }

  global.botDB.find({type: 'keywords'}, function (err, items) {
    if (err) console.log(err)
    for (var item in items) {
      if (items.hasOwnProperty(item)) {
        var position = msg.toLowerCase().indexOf(items[item].keyword)
        var kwLength = items[item].keyword.length
        if (position >= 0) {
          if ((msg[position - 1] === ' ' || typeof msg[position - 1] === 'undefined') &&
            (msg[position + kwLength] === ' ' || typeof msg[position + kwLength] === 'undefined')) {
            global.client.action(global.configuration.get().twitch.owner, items[item].response)
          }
        }
      }
    }
    global.updateQueue(id, true)
  })
}

Keywords.prototype.listKeywords = function () {
  global.botDB.find({type: 'keywords'}, function (err, docs) {
    if (err) { console.log(err) }
    var keywords = []
    docs.forEach(function (e, i, ar) { keywords.push('!' + e.keyword) })
    var output = (docs.length === 0 ? 'Keywords list is empty.' : 'Keyword list: ' + keywords.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Keywords.prototype.delKeyword = function (self, sender, text) {
  var data = {_type: 'keywords', _keyword: text.trim(), success: 'Keyword was succesfully removed.', error: 'Keyword cannot be found.'}
  if (data._keyword.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + sender + ', keyword command is not correct, check !keyword')
  } else {
    global.commons.remove(data)
  }
}
module.exports = new Keywords()
