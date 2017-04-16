'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

function Ranks () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!rank add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!rank list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!rank remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!rank help', this.help, constants.OWNER_ONLY)
    global.parser.register(this, '!rank', this.show, constants.VIEWERS)

    // count Points - every 30s check points
    var self = this
    setInterval(function () {
      self.updateRanks()
    }, 60000)

    this.webPanel()
  }
}

Ranks.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'ranks', id: 'ranks'})
  global.panel.socketListening(this, 'getRanks', this.listSocket)
  global.panel.socketListening(this, 'deleteRank', this.deleteSocket)
  global.panel.socketListening(this, 'createRank', this.createSocket)
}

Ranks.prototype.listSocket = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('rank') }}).sort({ hours: 1 }).exec(function (err, items) {
    if (err) { log.error(err, { fnc: 'Ranks.prototype.listSocket' }) }
    socket.emit('Ranks', items)
  })
}

Ranks.prototype.deleteSocket = function (self, socket, data) {
  self.remove(self, null, data)
  self.listSocket(self, socket)
}

Ranks.prototype.createSocket = function (self, socket, data) {
  self.add(self, null, data.hours + ' ' + data.rank)
  self.listSocket(self, socket)
}

Ranks.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !rank add <hours> <rank> | !rank remove <hour> | !rank list', sender)
}

Ranks.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\d+) ([\u0500-\u052F\u0400-\u04FF\w].+)$/)
    global.commons.insertIfNotExists({__id: 'rank_' + parsed[1], rank: parsed[2], _hours: parseInt(parsed[1], 10), success: 'rank.success.add', error: 'rank.failed.add'})
  } catch (e) {
    global.commons.sendMessage(global.translate('rank.failed.parse'), sender)
  }
}

Ranks.prototype.list = function (self, sender, text) {
  if (_.isNull(text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/))) {
    global.botDB.find({$where: function () { return this._id.startsWith('rank') }}).sort({ hours: 1 }).exec(function (err, docs) {
      if (err) { log.error(err, { fnc: 'Ranks.prototype.list' }) }
      var list = []
      var output
      if (!_.isNil(docs)) {
        output = global.translate('rank.success.list') + ':'
      } else {
        docs.forEach(function (e, i, ar) { list.push(e.hours + ' ' + e.rank) })
        output = (docs.length === 0 ? global.translate('rank.failed.list') : global.translate('rank.success.list') + ': ' + list.join(', '))
      }
      global.commons.sendMessage(output, sender)
    })
  } else {
    global.commons.sendMessage(global.translate('rank.failed.parse'), sender)
  }
}

Ranks.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\d+)$/)
    global.commons.remove({__id: 'rank_' + parsed[1], success: 'rank.success.remove', error: 'rank.failed.notFound'})
  } catch (e) {
    global.commons.sendMessage(global.translate('rank.failed.parse'), sender)
  }
}

Ranks.prototype.show = function (self, sender) {
  global.commons.sendMessage(global.translate('rank.success.show').replace('(rank)', global.users.get(sender.username).rank), sender)
}

Ranks.prototype.updateRanks = function () {
  _.each(global.users.getAll({ is: { online: true } }), function (user) {
    var watchTime = user.time.watched
    watchTime = _.isFinite(parseInt(watchTime, 10)) && _.isNumber(parseInt(watchTime, 10)) ? (watchTime / 1000 / 60 / 60).toFixed(0) : 0

    global.botDB.find({$where: function () { return this._id.startsWith('rank') }}).sort({ hours: 1 }).exec(function (err, items) {
      if (err) { log.error(err, { fnc: 'Ranks.prototype.updateRanks' }) }
      _.each(items, function (rank) {
        if (watchTime >= parseInt(rank.hours, 10)) {
          global.users.set(user.username, {rank: rank.rank})
        }
      })
    })
  })
}

module.exports = new Ranks()
