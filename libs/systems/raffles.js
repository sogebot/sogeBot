'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

const ELIGIBILITY_FOLLOWERS = 0
const ELIGIBILITY_SUBSCRIBERS = 1
const ELIGIBILITY_EVERYONE = 2

const TYPE_NORMAL = 0
const TYPE_TICKETS = 1

/*
 * !raffle                               - gets an info about raffle
 * !raffle open [raffle-keyword] [product] [min=#] [max=#] [time=#] [type=keyword|tickets] [followers]
 *                                       - open a new raffle with selected keyword for specified product (optional),
 *                                       - min=# - minimal of tickets to join, max=# - max of tickets to join
 *                                       - time=# (optional) - minimal watched time in minutes, for followers? (optional)
 *                                       - type=keyword or type=tickets
 * !raffle close                         - close a raffle manually
 * !raffle pick                          - pick or repick a winner of raffle
 * ![raffle-keyword]                     - join a raffle
 * !set raffleAnnounceInterval [minutes] - reannounce raffle interval each x minutes
 */

function Raffles () {
  if (global.commons.isSystemEnabled(this)) {
    this.lastAnnounce = 0
    this.keyword = null
    this.product = null
    this.minWatchedTime = 0
    this.minTickets = 1
    this.maxTickets = 1000
    this.eligibility = 0
    this.type = 0
    this.status = null
    this.locked = false

    this.participants = {}

    global.parser.register(this, '!raffle pick', this.pick, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle close', this.close, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle open', this.open, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle', this.info, constants.VIEWERS)
    global.parser.registerHelper('!raffle')
    global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)
    global.configuration.register('raffleAnnounceCustomMessage', 'raffle.announceCustomMessage', 'string', '')
    global.configuration.register('raffleTitleTemplate', 'raffle.announceTitleTemplate', 'string', '')

    global.watcher.watch(this, 'participants', this._save)
    this._update(this)

    var self = this
    setInterval(function () {
      if (new Date().getTime() < self.lastAnnounce + (global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000) || _.isNil(self.keyword) || self.locked) return
      self.lastAnnounce = new Date().getTime()

      let message
      if (global.configuration.getValue('raffleAnnounceCustomMessage').length > 0) {
        message = global.configuration.getValue('raffleAnnounceCustomMessage')
          .replace('(keyword)', self.keyword)
          .replace('(product)', self.product)
          .replace('(min)', self.minTickets)
          .replace('(max)', self.maxTickets)
      } else {
        let path = 'raffle.open.notice'

        if (self.eligibility === ELIGIBILITY_FOLLOWERS) path += '.followers'
        else if (self.eligibility === ELIGIBILITY_SUBSCRIBERS) path += '.subscribers'
        else path += '.everyone'

        if (self.product) path += 'AndProduct'
        if (self.type === TYPE_TICKETS) path += 'Tickets'

        message = global.translate(path)
          .replace('(keyword)', self.keyword)
          .replace('(product)', self.product)
          .replace('(min)', self.minTickets)
          .replace('(max)', self.maxTickets)
      }

      if (self.minWatchedTime > 0) {
        message += ' ' + global.translate('raffle.minWatchedTime').replace('(time)', self.minWatchedTime)
      }
      global.commons.sendMessage(message + '.', { username: null }, { force: true })
    }, 10000)

    this.registerRaffleKeyword(this)
  }
}

Raffles.prototype._save = function (self) {
  var participants = {
    participants: self.participants
  }
  global.botDB.update({ _id: 'raffle_participants' }, { $set: participants })
}

Raffles.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'raffle_participants' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffle.prototype._update' })
    if (_.isNull(item)) return

    self.participants = item.participants
  })
}

Raffles.prototype.registerRaffleKeyword = function (self) {
  if (!_.isNull(self.keyword)) global.parser.unregister('!' + self.keyword)
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.registerRaffleKeyword' })
    if (!_.isNull(item)) {
      global.parser.register(self, '!' + item.keyword, self.participate, constants.VIEWERS)
      self.keyword = item.keyword
      self.product = item.product
      self.eligibility = item.eligibility
      self.type = item.type
      self.minTickets = item.minTickets
      self.maxTickets = item.maxTickets
      self.minWatchedTime = item.minWatchedTime
      self.locked = item.locked
    }
  })
}

Raffles.prototype.pick = function (self, sender) {
  if (_.size(self.participants) === 0) {
    global.commons.sendMessage(global.translate('raffle.pick.noParticipants'), sender)
    return true
  }

  let winnerArray = []
  let _total = 0
  _.each(self.participants, function (dict, username) {
    if (!dict.eligible) return true
    _total = _total + parseInt(dict.tickets)
    for (let i = 0; i < dict.tickets; i++) {
      winnerArray.push(username)
    }
  })

  const winner = winnerArray[_.random(0, parseInt(_total, 10) - 1, false)]
  if (_.isNil(winner)) {
    global.commons.sendMessage(global.translate('raffle.pick.noParticipants'), sender)
    return true
  }
  self.participants[winner].eligible = false

  let probability = parseInt(self.participants[winner].tickets, 10) / (parseInt(_total, 10) / 100)

  global.botDB.update({_id: 'raffle'}, {$set: { winner: global.users.get(winner), locked: true, timestamp: new Date().getTime() }})
  self.locked = true
  global.commons.sendMessage(global.translate(!_.isNil(self.product) && self.product.trim().length > 0 ? 'raffle.pick.winner.withProduct' : 'raffle.pick.winner.withoutProduct')
    .replace('(winner)', winner)
    .replace('(product)', self.product)
    .replace('(probability)', _.round(probability, 2)), sender)
  global.parser.unregister('!' + self.keyword)
  global.widgets.raffles.sendWinner(global.widgets.raffles, global.users.get(winner))
  clearInterval(self.timer)
}

Raffles.prototype.participate = function (self, sender, text) {
  sender['message-type'] = 'whisper'
  let tickets = parseInt(text.trim(), 10)

  if ((!_.isFinite(tickets) || tickets <= 0 || tickets > self.maxTickets || tickets < self.minTickets) && self.type === TYPE_TICKETS) {
    global.commons.sendMessage(global.translate('raffle.participation.failed'), sender)
    return true
  }

  let curTickets = !_.isNil(self.participants[sender.username]) ? parseInt(self.participants[sender.username].tickets, 10) : 0
  let newTickets = curTickets + tickets

  if (newTickets > self.maxTickets) { newTickets = self.maxTickets }
  tickets = newTickets - curTickets

  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.participate' })
    if (!_.isNull(item) && !item.locked) {
      var participant = {
        eligible: true,
        tickets: self.type === TYPE_NORMAL ? 1 : newTickets,
        username: sender.username
      }

      const user = global.users.get(sender.username)
      if (item.eligibility === ELIGIBILITY_FOLLOWERS) {
        participant.eligible = _.isUndefined(user.is.follower) ? false : user.is.follower
      }

      if (item.eligibility === ELIGIBILITY_SUBSCRIBERS) {
        participant.eligible = _.isUndefined(user.is.subscriber) ? false : user.is.subscriber
      }

      if (participant.eligible && item.minWatchedTime > 0) {
        participant.eligible = !_.isUndefined(user.time.watched) && (user.time.watched - 3600000) > 0
      }

      if (item.type === TYPE_TICKETS) {
        participant.eligible = user.points >= tickets
      }

      if (participant.eligible) {
        if (item.type === TYPE_TICKETS) global.users.set(sender.username, { points: parseInt(user.points, 10) - parseInt(tickets, 10) })
        global.commons.sendMessage(global.translate('raffle.participation.success'), sender)
        delete self.participants[sender.username]
        self.participants[sender.username] = participant
      } else {
        global.commons.sendMessage(global.translate('raffle.participation.failed'), sender)
      }
    }
  })
}

Raffles.prototype.info = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.info' })
    if (!_.isNull(item)) {
      if (!_.isNull(item.winner)) global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
      else if (!item.locked) {
        let message
        let path = 'raffle.info.opened'

        if (item.eligibility === ELIGIBILITY_FOLLOWERS) path += '.followers'
        else if (item.eligibility === ELIGIBILITY_SUBSCRIBERS) path += '.subscribers'
        else path += '.everyone'

        if (item.product) path += 'AndProduct'
        if (item.type === TYPE_TICKETS) path += 'Tickets'

        message = global.translate(path)
          .replace('(keyword)', item.keyword)
          .replace('(product)', item.product)
          .replace('(min)', item.minTickets)
          .replace('(max)', item.maxTickets)

        if (item.minWatchedTime > 0) {
          message += ' ' + global.translate('raffle.minWatchedTime').replace('(time)', item.minWatchedTime)
        }
        global.commons.sendMessage(message + '.', sender)
      } else {
        global.commons.sendMessage(global.translate('raffle.info.closed'), sender)
      }
    } else {
      global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
    }
  })
}

Raffles.prototype.open = function (self, sender, text, dashboard = false) {
  try {
    let eligibility = ELIGIBILITY_EVERYONE

    if (text.indexOf('followers') >= 0) {
      text = text.replace('followers', '').trim()
      eligibility = ELIGIBILITY_FOLLOWERS
    }
    if (text.indexOf('subscribers') >= 0) {
      text = text.replace('subscribers', '').trim()
      eligibility = ELIGIBILITY_SUBSCRIBERS
    }

    // check if time is set
    let minWatchedTime = 0
    for (let part of text.trim().split(' ')) {
      if (part.startsWith('time=')) {
        minWatchedTime = part.replace('time=', '')
        break
      }
    }
    text = text.replace('time=' + minWatchedTime, '')

    let type = TYPE_NORMAL
    for (let part of text.trim().split(' ')) {
      if (part.startsWith('type=')) {
        type = part.replace('type=', '') === 'keyword' ? TYPE_NORMAL : TYPE_TICKETS
        break
      }
    }
    text = text.replace('type=' + (type === TYPE_NORMAL ? 'keyword' : 'tickets'), '')
    // ignore type settings if points are not enabled
    if (!global.commons.isSystemEnabled('points')) type = 0

    let minTickets = 0
    for (let part of text.trim().split(' ')) {
      if (part.startsWith('min=')) {
        minTickets = part.replace('min=', '')
        break
      }
    }
    text = text.replace('min=' + minTickets, '')

    let maxTickets = 1000
    for (let part of text.trim().split(' ')) {
      if (part.startsWith('max=')) {
        maxTickets = part.replace('max=', '')
        break
      }
    }
    text = text.replace('max=' + maxTickets, '')

    var parsed = text.trim().match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)?/)
    var groups = { keyword: 1, product: 2 }
    var raffle = {
      keyword: parsed[groups.keyword],
      eligibility: eligibility,
      product: !_.isNil(parsed[groups.product]) ? parsed[groups.product] : '',
      minWatchedTime: minWatchedTime,
      type: type,
      minTickets: minTickets,
      maxTickets: maxTickets,
      winner: null,
      locked: false
    }

    // check if keyword is free
    if (global.parser.isRegistered(raffle.keyword)) {
      global.commons.sendMessage(global.translate('core.isRegistered').replace('(keyword)', '!' + raffle.keyword), sender)
      return
    }

    global.botDB.update({_id: 'raffle'}, {$set: raffle}, {upsert: true}, function (err) {
      if (err) return log.error(err, { fnc: 'Raffles.prototype.open' })

      let message
      let path = 'raffle.open.ok'

      if (raffle.eligibility === ELIGIBILITY_FOLLOWERS) path += '.followers'
      else if (raffle.eligibility === ELIGIBILITY_SUBSCRIBERS) path += '.subscribers'
      else path += '.everyone'

      if (raffle.product) path += 'AndProduct'
      if (raffle.type === TYPE_TICKETS) path += 'Tickets'

      message = global.translate(path)
        .replace('(keyword)', raffle.keyword)
        .replace('(product)', raffle.product)
        .replace('(min)', raffle.minTickets)
        .replace('(max)', raffle.maxTickets)

      if (raffle.minWatchedTime > 0) {
        message += ' ' + global.translate('raffle.minWatchedTime').replace('(time)', raffle.minWatchedTime)
      }
      global.commons.sendMessage(message + '.', sender)

      self.participants = {}
      self._save(self)

      // register raffle keyword
      self.registerRaffleKeyword(self)
      self.lastAnnounce = new Date().getTime()
      if (global.configuration.getValue('raffleTitleTemplate').trim().length > 0) {
        self.status = global.twitch.currentStatus
        global.twitch.setTitle(global.twitch, null, self.status + ' ' + global.configuration.getValue('raffleTitleTemplate').replace('(product)', !raffle.product ? ' ' : raffle.product).replace('(keyword)', raffle.keyword))
      }
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('raffle.open.error'))
  }
}

Raffles.prototype.close = function (self, sender, text) {
  if (!_.isNil(self.status)) {
    global.twitch.setTitle(global.twitch, null, self.status)
    self.status = null
  }

  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.close' })
    if (!_.isNull(item)) {
      global.botDB.update({_id: 'raffle'}, {$set: {locked: true}}, {}, function (err) {
        if (err) return log.error(err, { fnc: 'Raffles.prototype.close' })
        global.commons.sendMessage(global.translate('raffle.close.ok'), sender)
      })

      clearInterval(self.timer)
      global.parser.unregister('!' + item.keyword)
      self._save(self)
    } else {
      global.commons.sendMessage(global.translate('raffle.close.notRunning'), sender)
    }
  })
}

module.exports = new Raffles()
