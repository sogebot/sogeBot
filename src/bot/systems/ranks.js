'use strict'

// 3rdparty libraries
const _ = require('lodash')

// bot libraries
import { permission } from '../permissions';
import { command, default_permission } from '../decorators';
import System from './_interface'
const commons = require('../commons');

/*
 * !rank                       - show user rank
 * !rank add <hours> <rank>    - add <rank> for selected <hours>
 * !rank remove <hours>        - remove rank for selected <hours>
 * !rank list                  - show rank list
 * !rank set <username> <rank> - set custom <rank> for <username>
 * !rank unset <username>      - unset custom rank for <username>
 */

class Ranks extends System {
  constructor () {
    super()

    this.addMenu({ category: 'manage', name: 'ranks', id: 'ranks/list' })
  }

  @command('!rank add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    const parsed = opts.parameters.match(/^(\d+) ([\S].+)$/)

    if (_.isNil(parsed)) {
      let message = await commons.prepare('ranks.rank-parse-failed')
      commons.sendMessage(message, opts.sender)
      return false
    }

    const values = {
      hours: parseInt(parsed[1], 10),
      value: parsed[2]
    }

    var ranks = await global.db.engine.find(this.collection.data, { hours: values.hours })
    if (ranks.length === 0) { global.db.engine.insert(this.collection.data, values) }

    let message = await commons.prepare(ranks.length === 0 ? 'ranks.rank-was-added' : 'ranks.ranks-already-exist', { rank: values.value, hours: values.hours })
    commons.sendMessage(message, opts.sender)
  }

  @command('!rank edit')
  @default_permission(permission.CASTERS)
  async edit (opts) {
    let parsed = opts.parameters.match(/^(\d+) ([\S].+)$/)

    if (_.isNil(parsed)) {
      let message = await commons.prepare('ranks.rank-parse-failed')
      commons.sendMessage(message, opts.sender)
      return false
    }

    const hours = parsed[1]
    const rank = parsed[2]

    let item = await global.db.engine.findOne(this.collection.data, { hours: parseInt(hours, 10) })
    if (_.isEmpty(item)) {
      let message = await commons.prepare('ranks.rank-was-not-found', { hours: hours })
      commons.sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { hours: parseInt(hours, 10) }, { value: rank })
    let message = await commons.prepare('ranks.rank-was-edited', { hours: parseInt(hours, 10), rank: rank })
    commons.sendMessage(message, opts.sender)
  }

  @command('!rank set')
  @default_permission(permission.CASTERS)
  async set (opts) {
    var parsed = opts.parameters.match(/^([\S]+) ([\S ]+)$/)

    if (_.isNil(parsed)) {
      let message = await commons.prepare('ranks.rank-parse-failed')
      commons.sendMessage(message, opts.sender)
      return false
    }

    global.users.set(parsed[1], { custom: { rank: parsed[2].trim() } })

    let message = await commons.prepare('ranks.custom-rank-was-set-to-user', { rank: parsed[2].trim(), username: parsed[1] })
    commons.sendMessage(message, opts.sender)
  }

  @command('!rank unset')
  @default_permission(permission.CASTERS)
  async unset (opts) {
    var parsed = opts.parameters.match(/^([\S]+)$/)

    if (_.isNil(parsed)) {
      let message = await commons.prepare('ranks.rank-parse-failed')
      commons.sendMessage(message, opts.sender)
      return false
    }

    global.users.set(parsed[1], { custom: { rank: null } })
    let message = await commons.prepare('ranks.custom-rank-was-unset-for-user', { username: parsed[1] })
    commons.sendMessage(message, opts.sender)
  }

  @command('!rank help')
  @default_permission(permission.CASTERS)
  help (opts) {
    commons.sendMessage(global.translate('core.usage') + ': !rank add <hours> <rank> | !rank edit <hours> <rank> | !rank remove <hour> | !rank list | !rank set <username> <rank> | !rank unset <username>', opts.sender)
  }

  @command('!rank list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    let ranks = await global.db.engine.find(this.collection.data)
    var output = await commons.prepare(ranks.length === 0 ? 'ranks.list-is-empty' : 'ranks.list-is-not-empty', { list: _.map(_.orderBy(ranks, 'hours', 'asc'), function (l) { return l.hours + 'h - ' + l.value }).join(', ') })
    commons.sendMessage(output, opts.sender)
  }

  @command('!rank remove')
  @default_permission(permission.CASTERS)
  async remove (opts) {
    const parsed = opts.parameters.match(/^(\d+)$/)
    if (_.isNil(parsed)) {
      let message = await commons.prepare('ranks.rank-parse-failed')
      commons.sendMessage(message, opts.sender)
      return false
    }

    const hours = parseInt(parsed[1], 10)
    const removed = await global.db.engine.remove(this.collection.data, { hours: hours })

    let message = await commons.prepare(removed ? 'ranks.rank-was-removed' : 'ranks.rank-was-not-found', { hours: hours })
    commons.sendMessage(message, opts.sender)
  }

  @command('!rank')
  async main (opts) {
    let watched = await global.users.getWatchedOf(opts.sender.userId)
    let rank = await this.get(opts.sender.username)

    let [ranks, current] = await Promise.all([global.db.engine.find(this.collection.data), global.db.engine.findOne(this.collection.data, { value: rank })])

    let nextRank = null
    for (let _rank of _.orderBy(ranks, 'hours', 'desc')) {
      if (_rank.hours > watched / 1000 / 60 / 60) {
        nextRank = _rank
      } else {
        break
      }
    }

    if (_.isNil(rank)) {
      let message = await commons.prepare('ranks.user-dont-have-rank')
      commons.sendMessage(message, opts.sender)
      return true
    }

    if (!_.isNil(nextRank)) {
      let toNextRank = nextRank.hours - current.hours
      let toNextRankWatched = watched / 1000 / 60 / 60 - current.hours
      let toWatch = (toNextRank - toNextRankWatched)
      let percentage = 100 - (((toWatch) / toNextRank) * 100)
      let message = await commons.prepare('ranks.show-rank-with-next-rank', { rank: rank, nextrank: `${nextRank.value} ${percentage.toFixed(1)}% (${toWatch.toFixed(1)}h)` })
      commons.sendMessage(message, opts.sender)
      return true
    }

    let message = await commons.prepare('ranks.show-rank-without-next-rank', { rank: rank })
    commons.sendMessage(message, opts.sender)
  }

  async get (user) {
    if (!_.isObject(user)) user = await global.users.getByName(user)
    if (!_.isNil(user.custom.rank)) return user.custom.rank

    let [watched, ranks] = await Promise.all([
      global.users.getWatchedOf(user.id),
      global.db.engine.find(this.collection.data)
    ])
    let rankToReturn = null

    for (let rank of _.orderBy(ranks, 'hours', 'asc')) {
      if (watched / 1000 / 60 / 60 >= rank.hours) {
        rankToReturn = rank.value
      } else break
    }
    return rankToReturn
  }
}

module.exports = new Ranks()
