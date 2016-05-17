'use strict'

var chalk = require('chalk')
var Database = require('nedb')
var constants = require('../constants')

var database = new Database({
  filename: 'db/keywords.db',
  autoload: true
})
database.persistence.setAutocompactionInterval(60000)

// TODO - add parsing of (sender)

function Keywords (configuration) {
  if (global.configuration.get().systems.keywords === true) {
    global.parser.register('!keyword add', this.addKeyword, constants.OWNER_ONLY)
    global.parser.register('!keyword list', this.listKeywords, constants.OWNER_ONLY)
    global.parser.register('!keyword remove', this.delKeyword, constants.OWNER_ONLY)
    global.parser.register('!keyword', this.help, constants.OWNER_ONLY)

    global.parser.registerParser('keywords', this.customKeyword, constants.VIEWERS)
  }

  console.log('Keywords system loaded and ' + (global.configuration.get().systems.keywords === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Keywords.prototype.help = function () {
  var text = 'Usage: !keyword add <keyword> <response> | !keyword remove <keyword> | !keyword list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

Keywords.prototype.addKeyword = function (user, keyword) {
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

  database.find({ keyword: kw }, function (err, docs) {
    if (err) console.log(err)
    if (docs.length === 0) { // it is safe to insert new keyword?
      database.insert({keyword: kw, response: response}, function (err, newItem) {
        if (err) console.log(err)
        global.client.action(global.configuration.get().twitch.owner, 'Keyword#' + kw + ' succesfully added')
      })
    } else {
      global.client.action(global.configuration.get().twitch.owner, 'Keyword error: Cannot add duplicate keyword.')
    }
  })
}

Keywords.prototype.customKeyword = function (id, user, msg) {
  if (msg.startsWith('!')) {
    global.updateQueue(id, true) // don't want to parse commands
    return true
  }

  database.find({ }, function (err, items) {
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
  database.find({}, function (err, docs) {
    if (err) { console.log(err) }
    var keywords = []
    docs.forEach(function (e, i, ar) { keywords.push('!' + e.keyword) })
    var output = (docs.length === 0 ? 'Keywords list is empty.' : 'Keyword list: ' + keywords.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Keywords.prototype.delKeyword = function (user, keyword) {
  if (keyword.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Keyword error: Cannot delete keyword without keyword.')
    return
  }

  database.remove({keyword: keyword}, {}, function (err, numRemoved) {
    if (err) { console.log(err) }
    var output = (numRemoved === 0 ? 'Keyword#' + keyword + ' cannot be found.' : 'Keyword#' + keyword + ' is succesfully deleted.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}
module.exports = new Keywords()
