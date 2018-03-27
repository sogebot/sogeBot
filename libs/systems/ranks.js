'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('systems:ranks')

// bot libraries
const constants = require('../constants')

/*
 * !rank                       - show user rank
 * !rank add <hours> <rank>    - add <rank> for selected <hours>
 * !rank remove <hours>        - remove rank for selected <hours>
 * !rank list                  - show rank list
 * !rank set <username> <rank> - set custom <rank> for <username>
 * !rank unset <username>      - unset custom rank for <username>
 */

class Ranks {
  constructor () {
    if (global.commons.isSystemEnabled(this) && require('cluster').isMaster) {
      global.panel.addMenu({category: 'manage', name: 'ranks', id: 'ranks'})
      global.panel.registerSockets({
        self: this,
        expose: ['add', 'edit', 'editHours', 'remove', 'send'],
        finally: this.send
      })
    }
  }

  commands () {
    return !global.commons.isSystemEnabled('ranks')
      ? []
      : [
        {this: this, command: '!rank add', fnc: this.add, permission: constants.OWNER_ONLY},
        {this: this, command: '!rank edit', fnc: this.edit, permission: constants.OWNER_ONLY},
        {this: this, command: '!rank set', fnc: this.set, permission: constants.OWNER_ONLY},
        {this: this, command: '!rank unset', fnc: this.unset, permission: constants.OWNER_ONLY},
        {this: this, command: '!rank list', fnc: this.list, permission: constants.OWNER_ONLY},
        {this: this, command: '!rank remove', fnc: this.remove, permission: constants.OWNER_ONLY},
        {this: this, command: '!rank help', fnc: this.help, permission: constants.OWNER_ONLY},
        {this: this, command: '!rank', fnc: this.show, permission: constants.VIEWERS}
      ]
  }

  async add (self, sender, text) {
    debug('add(%j, %j, %j)', self, sender, text)
    const parsed = text.match(/^(\d+) ([\S].+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('ranks.rank-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const values = {
      hours: parseInt(parsed[1], 10),
      value: parsed[2]
    }

    var ranks = await global.db.engine.find('ranks', { hours: values.hours })
    if (ranks.length === 0) { global.db.engine.insert('ranks', values) }

    let message = global.commons.prepare(ranks.length === 0 ? 'ranks.rank-was-added' : 'ranks.ranks-already-exist', { rank: values.value, hours: values.hours })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async send (self, socket) { socket.emit('ranks', _.orderBy(await global.db.engine.find('ranks'), 'hours', 'asc')) }

  async editHours (self, socket, data) {
    if (data.value.length === 0) await self.remove(self, null, data.id)
    else {
      let item = await global.db.engine.findOne('ranks', { hours: parseInt(parseInt(data.value, 10), 10) })
      if (_.isEmpty(item)) { await global.db.engine.update('ranks', { hours: parseInt(data.id, 10) }, { hours: parseInt(data.value, 10) }) }
    }
  }

  async edit (self, sender, text) {
    debug('edit(%j, %j, %j)', self, sender, text)
    let parsed = text.match(/^(\d+) ([\S].+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('ranks.rank-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const hours = parsed[1]
    const rank = parsed[2]

    let item = await global.db.engine.findOne('ranks', { hours: parseInt(hours, 10) })
    if (_.isEmpty(item)) {
      let message = global.commons.prepare('ranks.rank-was-not-found', { hours: hours })
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    await global.db.engine.update('ranks', { hours: parseInt(hours, 10) }, { value: rank })
    let message = global.commons.prepare('ranks.rank-was-edited', { hours: parseInt(hours, 10), rank: rank })
    debug(message); global.commons.sendMessage(message, sender)
  }

  set (self, sender, text) {
    debug('set(%j, %j, %j)', self, sender, text)
    var parsed = text.match(/^([\S]+) ([\S ]+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('ranks.rank-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    global.users.set(parsed[1], { custom: { rank: parsed[2].trim() } })

    let message = global.commons.prepare('ranks.custom-rank-was-set-to-user', { rank: parsed[2].trim(), username: parsed[1] })
    debug(message); global.commons.sendMessage(message, sender)
  }

  unset (self, sender, text) {
    debug('unset(%j, %j, %j)', self, sender, text)
    var parsed = text.match(/^([\S]+)$/)

    if (_.isNil(parsed)) {
      let message = global.commons.prepare('ranks.rank-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    global.users.set(parsed[1], { custom: { rank: null } })
    let message = global.commons.prepare('ranks.custom-rank-was-unset-for-user', { username: parsed[1] })
    debug(message); global.commons.sendMessage(message, sender)
  }

  help (self, sender) {
    global.commons.sendMessage(global.translate('core.usage') + ': !rank add <hours> <rank> | !rank edit <hours> <rank> | !rank remove <hour> | !rank list | !rank set <username> <rank> | !rank unset <username>', sender)
  }

  async list (self, sender) {
    debug('list(%j, %j)', self, sender)
    let ranks = await global.db.engine.find('ranks')
    var output = global.commons.prepare(ranks.length === 0 ? 'ranks.list-is-empty' : 'ranks.list-is-not-empty', { list: _.map(_.orderBy(ranks, 'hours', 'asc'), function (l) { return l.hours + 'h - ' + l.value }).join(', ') })
    debug(output); global.commons.sendMessage(output, sender)
  }

  async remove (self, sender, text) {
    debug('remove(%j, %j, %j)', self, sender, text)

    const parsed = text.match(/^(\d+)$/)
    if (_.isNil(parsed)) {
      let message = global.commons.prepare('ranks.rank-parse-failed')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    const hours = parseInt(parsed[1], 10)
    const removed = await global.db.engine.remove('ranks', { hours: hours })

    let message = global.commons.prepare(removed ? 'ranks.rank-was-removed' : 'ranks.rank-was-not-found', { hours: hours })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async show (self, sender) {
    debug('show(%j, %j)', self, sender)

    let user = await global.users.get(sender.username)
    let rank = await self.get(user)
    debug('Users rank: %j', rank)

    let [ranks, current] = await Promise.all([global.db.engine.find('ranks'), global.db.engine.findOne('ranks', { value: rank })])

    let nextRank = null
    for (let _rank of _.orderBy(ranks, 'hours', 'desc')) {
      if (_rank.hours > _.get(user, 'time.watched', 0) / 1000 / 60 / 60) {
        nextRank = _rank
      } else {
        break
      }
    }

    if (_.isNil(rank)) {
      let message = global.commons.prepare('ranks.user-dont-have-rank')
      debug(message); global.commons.sendMessage(message, sender)
      return true
    }

    if (!_.isNil(nextRank)) {
      let toNextRank = nextRank.hours - current.hours
      let toNextRankWatched = _.get(user, 'time.watched', 0) / 1000 / 60 / 60 - current.hours
      let toWatch = (toNextRank - toNextRankWatched)
      let percentage = 100 - (((toWatch) / toNextRank) * 100)
      let message = global.commons.prepare('ranks.show-rank-with-next-rank', { rank: rank, nextrank: `${nextRank.value} ${percentage.toFixed(1)}% (${toWatch.toFixed(1)}h)` })
      debug(message); global.commons.sendMessage(message, sender)
      return true
    }

    let message = global.commons.prepare('ranks.show-rank-without-next-rank', { rank: rank })
    debug(message); global.commons.sendMessage(message, sender)
  }

  async get (user) {
    debug('update()')

    if (!_.isObject(user)) user = await global.users.get(user)
    if (!_.isNil(user.custom.rank)) return user.custom.rank

    let ranks = await global.db.engine.find('ranks')
    let rankToReturn = null

    for (let rank of _.orderBy(ranks, 'hours', 'asc')) {
      if (_.get(user, 'time.watched', 0) / 1000 / 60 / 60 >= rank.hours) {
        rankToReturn = rank.value
      } else break
    }
    return rankToReturn
  }
}

module.exports = new Ranks()
