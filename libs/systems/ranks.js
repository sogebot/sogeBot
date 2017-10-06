'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
const constants = require('../constants')

// debug
const debug = require('debug')('systems:ranks')

/*
 * !rank                       - show user rank
 * !rank add <hours> <rank>    - add <rank> for selected <hours>
 * !rank remove <hours>        - remove rank for selected <hours>
 * !rank list                  - show rank list
 * !rank set <username> <rank> - set custom <rank> for <username>
 * !rank unset <username>      - unset custom rank for <username>
 */

function Ranks () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!rank add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!rank set', this.set, constants.OWNER_ONLY)
    global.parser.register(this, '!rank unset', this.unset, constants.OWNER_ONLY)
    global.parser.register(this, '!rank list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!rank remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!rank help', this.help, constants.OWNER_ONLY)
    global.parser.register(this, '!rank', this.show, constants.VIEWERS)

    // count Points
    setInterval(() => {
      this.updateRanks()
    }, 60000)
    this.webPanel()
  }
}

Ranks.prototype.webPanel = function () {
  global.panel.addMenu({category: 'manage', name: 'ranks', id: 'ranks'})
  global.panel.socketListening(this, 'getRanks', this.listSocket)
  global.panel.socketListening(this, 'deleteRank', this.deleteSocket)
  global.panel.socketListening(this, 'createRank', this.createSocket)
  global.panel.socketListening(this, 'ranks.edit', this.editSocket)
}

Ranks.prototype.listSocket = async function (self, socket) {
  let ranks = await global.db.engine.find('ranks')
  socket.emit('Ranks', _.orderBy(ranks, 'hours', 'asc'))
}

Ranks.prototype.editSocket = function (self, socket, data) {
  if (data.value.length === 0) self.remove(self, null, data.id)
  global.db.engine.update('ranks', { hours: parseInt(data.id, 10) }, { value: data.value })
  self.listSocket(self, socket)
}

Ranks.prototype.deleteSocket = function (self, socket, data) {
  self.remove(self, null, data)
  self.listSocket(self, socket)
}

Ranks.prototype.createSocket = function (self, socket, data) {
  self.add(self, null, data.hours + ' ' + data.value)
  self.listSocket(self, socket)
}

Ranks.prototype.help = function (self, sender) {
  if (debug.enabled) debug('help(self,%s)', JSON.stringify(sender))
  global.commons.sendMessage(global.translate('core.usage') + ': !rank add <hours> <rank> | !rank remove <hour> | !rank list | !rank set <username> <rank> | !rank unset <username>', sender)
}

Ranks.prototype.add = async function (self, sender, text) {
  if (debug.enabled) debug('add(self, %s, %s)', JSON.stringify(sender), text)
  const parsed = text.match(/^(\d+) ([\u0500-\u052F\u0400-\u04FF\w].+)$/)
  if (_.isNil(parsed)) return global.commons.sendMessage(global.translate('rank.failed.parse'), sender)

  const values = {
    hours: parseInt(parsed[1], 10),
    value: parsed[2]
  }

  var ranks = await global.db.engine.find('ranks', { hours: values.hours })
  if (ranks.length === 0) { global.db.engine.insert('ranks', values) }

  global.commons.sendMessage(
    global.translate(ranks.length === 0
      ? 'rank.success.add' : 'rank.failed.add'
    ), sender)
}

Ranks.prototype.list = async function (self, sender) {
  if (debug.enabled) debug('list(self, %s)', JSON.stringify(sender))
  var list = await global.db.engine.find('ranks')
  global.commons.sendMessage(
    (list.length === 0
      ? global.translate('rank.failed.list')
      : global.translate('rank.success.list') + ': ' + _.map(_.orderBy(list, 'hours', 'asc'), function (l) { return l.hours + 'h - ' + l.value }).join(', '))
    , sender)
}

Ranks.prototype.remove = async function (self, sender, text) {
  if (debug.enabled) debug('remove(self, %s, %s)', JSON.stringify(sender), text)
  const parsed = text.match(/^(\d+)$/)
  if (_.isNil(parsed)) return global.commons.sendMessage(global.translate('rank.failed.parse'), sender)

  const values = {
    hours: parseInt(parsed[1], 10)
  }

  const removed = await global.db.engine.remove('ranks', values)
  global.commons.sendMessage(
    global.translate(removed > 0
      ? 'rank.success.remove' : 'rank.failed.remove'
    ), sender)
}

Ranks.prototype.set = function (self, sender, text) {
  if (debug.enabled) debug('set(self, %s, %s)', JSON.stringify(sender), text)
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([\u0500-\u052F\u0400-\u04FF\w ]+)$/)
    global.users.set(parsed[1], { custom: { rank: parsed[2].trim() } })
    global.commons.sendMessage(global.translate('rank.success.set')
      .replace(/\$rank/g, parsed[2])
      .replace(/\$username/g, parsed[1]), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('rank.failed.set'), sender)
  }
}

Ranks.prototype.unset = function (self, sender, text) {
  if (debug.enabled) debug('unset(self, %s, %s)', JSON.stringify(sender), text)
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    global.users.set(parsed[1], { custom: { rank: null } })
    global.commons.sendMessage(global.translate('rank.success.unset')
      .replace(/\$username/g, parsed[1]), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('rank.failed.unset'), sender)
  }
}

Ranks.prototype.show = async function (self, sender) {
  if (debug.enabled) debug('show(self, %s)', JSON.stringify(sender))
  let user = await global.users.get(sender.username)
  let rank = !_.isUndefined(user.rank) ? user.rank : null
  rank = !_.isNil(user.custom.rank) ? user.custom.rank : rank

  let watched = !_.isNil(user.time) && !_.isNil(user.time.watched) ? user.time.watched : 0
  let ranks = await global.db.engine.find('ranks')
  let nextRank = null
  for (let _rank of _.orderBy(ranks, 'hours', 'desc')) {
    if (_rank.hours > watched / 1000 / 60 / 60) {
      nextRank = _rank
    } else {
      break
    }
  }

  if (!_.isNil(nextRank)) {
    let toWatch = (nextRank.hours - (watched / 1000 / 60 / 60))
    let percentage = (toWatch / nextRank.hours) * 100
    nextRank = global.translate('rank.next-rank') + `${nextRank.value} ${percentage.toFixed(1)}% (${toWatch.toFixed(1)}h)`
  } else nextRank = ''

  global.commons.sendMessage(
    global.translate(!_.isNil(rank) ? 'rank.success.show' : 'rank.failed.show')
      .replace(/\$rank/g, rank).replace(/\$nextrank/g, nextRank), sender)
}

Ranks.prototype.updateRanks = async function () {
  if (debug.enabled) debug('updateRanks() users and ranks started')

  let users = await global.users.getAll({ is: { online: true } })
  let ranks = await global.db.engine.find('ranks')

  if (debug.enabled) debug('updateRanks() %i online users and %i ranks loaded', users.length, ranks.length)

  _.each(users, function (user) {
    var watchTime = user.time.watched
    watchTime = _.isFinite(parseInt(watchTime, 10)) && _.isNumber(parseInt(watchTime, 10)) ? (watchTime / 1000 / 60 / 60).toFixed(0) : 0

    let rankToUpdate
    _.each(_.orderBy(ranks, 'hours', 'asc'), function (rank) {
      if (watchTime >= parseInt(rank.hours, 10)) {
        rankToUpdate = rank.value
      } else {
        global.users.set(user.username, {rank: rankToUpdate})
        return false
      }
    })
  })

  if (debug.enabled) debug('updateRanks() finished')
}

module.exports = new Ranks()
