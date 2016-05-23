'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('underscore')

function Keywords () {
  if (global.configuration.get().systems.keywords === true) {
    global.parser.register(this, '!keyword add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!keyword', this.help, constants.OWNER_ONLY)

    global.parser.registerParser('keywords', this.run, constants.VIEWERS)
  }

  console.log('Keywords system loaded and ' + (global.configuration.get().systems.keywords === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Keywords.prototype.help = function () {
  var text = 'Usage: !keyword add <keyword> <response> | !keyword remove <keyword> | !keyword list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

Keywords.prototype.add = function (self, sender, keyword) {
  var data = {_type: 'keywords', _keyword: keyword.split(' ')[0], response: keyword.replace(keyword.split(' ')[0], '').trim(), success: 'Keyword was succesfully added', error: 'Sorry, ' + sender.username + ', this keyword already exists.'}
  data._keyword.length < 1 || data.response.length <= 1 ? global.commons.sendMessage('Sorry, ' + sender.username + ', keyword command is not correct, check !keyword') : global.commons.insertIfNotExists(data)
}

Keywords.prototype.run = function (id, user, msg) {
  global.botDB.find({type: 'keywords', $where: function () { return msg.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + this.keyword + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'g')) >= 0 }}, function (err, items) {
    if (err) console.log(err)
    _.each(items, function (item) { global.commons.sendMessage(item.response) })
    global.updateQueue(id, true)
  })
}

Keywords.prototype.list = function () {
  global.botDB.find({type: 'keywords'}, function (err, docs) {
    if (err) { console.log(err) }
    var keywords = []
    docs.forEach(function (e, i, ar) { keywords.push('!' + e.keyword) })
    var output = (docs.length === 0 ? 'Keywords list is empty.' : 'Keyword list: ' + keywords.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Keywords.prototype.remove = function (self, sender, text) {
  var data = {_type: 'keywords', _keyword: text.trim(), success: 'Keyword was succesfully removed.', error: 'Keyword cannot be found.'}
  data._keyword.length < 1 ? this.sendMessage('Sorry, ' + sender.username + ', keyword command is not correct, check !keyword') : global.commons.remove(data)
}

module.exports = new Keywords()
