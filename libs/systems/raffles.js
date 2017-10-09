'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
// debug
const debug = require('debug')('systems:raffles')

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
    this.status = null

    global.parser.register(this, '!raffle pick', this.pick, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle close', this.close, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle open', this.open, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle', this.info, constants.VIEWERS)

    global.parser.registerHelper('!raffle')

    global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)
    global.configuration.register('raffleAnnounceCustomMessage', 'raffle.announceCustomMessage', 'string', '')
    global.configuration.register('raffleTitleTemplate', 'raffle.announceTitleTemplate', 'string', '')
    global.configuration.register('disableRaffleWhispers', 'whisper.settings.disableRaffleWhispers', 'bool', false)

    /* TODO
    var self = this
    setInterval(function () {
      if (new Date().getTime() < self.lastAnnounce + (global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000) || _.isNil(self.keyword) || self.locked) return
      self.lastAnnounce = new Date().getTime()

      let message
      if (global.configuration.getValue('raffleAnnounceCustomMessage').length > 0) {
        message = global.configuration.getValue('raffleAnnounceCustomMessage')
          .replace(/\$keyword/g, self.keyword)
          .replace(/\$product/g, self.product)
          .replace(/\$min/g, self.minTickets)
          .replace(/\$max/g, self.maxTickets)
      } else {
        let path = 'raffle.open.notice'

        if (self.eligibility === ELIGIBILITY_FOLLOWERS) path += '.followers'
        else if (self.eligibility === ELIGIBILITY_SUBSCRIBERS) path += '.subscribers'
        else path += '.everyone'

        if (self.product) path += 'AndProduct'
        if (self.type === TYPE_TICKETS) path += 'Tickets'

        message = global.translate(path)
          .replace(/\$keyword/g, self.keyword)
          .replace(/\$product/g, self.product)
          .replace(/\$min/g, self.minTickets)
          .replace(/\$max/g, self.maxTickets)
      }

      if (self.minWatchedTime > 0) {
        message += ' ' + global.translate('raffle.minWatchedTime').replace(/\$time/g, self.minWatchedTime)
      }
      global.commons.sendMessage(message + '.', { username: null }, { force: true })
    }, 10000)
    */

    this.registerRaffleKeyword(this)
  }
}

Raffles.prototype.registerRaffleKeyword = async function (self) {
  if (debug.enabled) debug('registerRaffleKeyword()')
  let raffle = await global.db.engine.findOne('raffles', { locked: false })
  if (_.isEmpty(raffle)) return

  global.parser.unregister(raffle.keyword)
  global.parser.register(self, '!' + raffle.keyword, self.participate, constants.VIEWERS)
  if (debug.enabled) debug('Registering raffle\n  %j', raffle)
}

Raffles.prototype.pick = async function (self, sender) {
  let raffles = await global.db.engine.find('raffles', { locked: true })
  if (_.size(raffles) === 0) {
    global.commons.sendMessage(global.translate('raffle.pick.notClosed'), sender)
    return true
  }

  // get only latest raffle
  let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
  if (debug.enabled) debug('Picking winner for raffle\n  %j', raffle)

  let participants = await global.db.engine.find('raffle_participants', { raffle_id: raffle._id })
  if (participants.length === 0) {
    global.commons.sendMessage(global.translate('raffle.pick.noParticipants'), sender)
    return true
  }

  let winnerArray = []
  let _total = 0
  _.each(participants, function (dict) {
    if (debug.enabled) debug('participant: %j', dict)
    if (!dict.eligible) return true
    _total = _total + parseInt(dict.tickets)
    for (let i = 0; i < dict.tickets; i++) {
      winnerArray.push(dict.username)
    }
  })
  if (debug.enabled) debug('winnerArray: %j', winnerArray)

  const winner = winnerArray[_.random(0, parseInt(_total, 10) - 1, false)]
  if (_.isNil(winner)) {
    global.commons.sendMessage(global.translate('raffle.pick.noParticipants'), sender)
    return true
  }

  // uneligible winner (don't want to pick second time same user if repick)
  global.db.engine.update('raffle_participants', { raffle_id: raffle._id, username: winner }, { eligible: false })

  let participant = _.find(participants, (o) => o.username === winner)
  if (debug.enabled) debug('winner participant: %j', participant)
  let probability = parseInt(participant.tickets, 10) / (parseInt(_total, 10) / 100)

  global.db.engine.update('raffles', { _id: raffle._id }, { winner: global.users.get(winner), timestamp: new Date().getTime() })
  global.commons.sendMessage(global.translate(!_.isNil(raffle.product) && raffle.product.trim().length > 0 ? 'raffle.pick.winner.withProduct' : 'raffle.pick.winner.withoutProduct')
    .replace(/\$winner/g, winner)
    .replace(/\$product/g, raffle.product)
    .replace(/\$probability/g, _.round(probability, 2)), sender)
  global.widgets.raffles.sendWinner(global.widgets.raffles, global.users.get(winner))
  if (debug.enabled) debug('Raffle winner: %s', winner)
}

Raffles.prototype.participate = async function (self, sender, text) {
  if (debug.enabled) debug('participate(%j, %j, %s)', self, sender, text)

  sender['message-type'] = 'whisper'
  let tickets = parseInt(text.trim(), 10)

  let raffle = await global.db.engine.findOne('raffles', { locked: false })
  if (_.isEmpty(raffle)) { // shouldn't happen, but just to be sure (user can join when closing raffle)
    global.commons.sendMessage(global.translate('raffle.info.notRunning'))
    return true
  }

  if ((!_.isFinite(tickets) || tickets <= 0 || tickets > raffle.maxTickets || tickets < raffle.minTickets) && raffle.type === TYPE_TICKETS) {
    if (!global.configuration.getValue('disableRaffleWhispers')) global.commons.sendMessage(global.translate('raffle.participation.failed'), sender)
    return true
  }

  let participants = await global.db.engine.find('raffle_participants', { raffle_id: raffle._id })
  let curTickets = !_.isNil(participants[sender.username]) ? parseInt(participants[sender.username].tickets, 10) : 0
  let newTickets = curTickets + tickets

  if (newTickets > raffle.maxTickets) { newTickets = raffle.maxTickets }
  tickets = newTickets - curTickets

  let participant = {
    eligible: true,
    tickets: raffle.type === TYPE_NORMAL ? 1 : parseInt(newTickets, 10),
    username: sender.username,
    raffle_id: raffle._id,
    messages: []
  }
  if (debug.enabled) debug('new participant: %j', participant)

  const user = global.users.get(sender.username)
  if (raffle.eligibility === ELIGIBILITY_FOLLOWERS) {
    participant.eligible = _.isUndefined(user.is.follower) ? false : user.is.follower
  }

  if (raffle.eligibility === ELIGIBILITY_SUBSCRIBERS) {
    participant.eligible = _.isUndefined(user.is.subscriber) ? false : user.is.subscriber
  }

  if (participant.eligible && raffle.minWatchedTime > 0) {
    participant.eligible = !_.isUndefined(user.time.watched) && (user.time.watched - 3600000) > 0
  }

  if (raffle.type === TYPE_TICKETS) {
    participant.eligible = user.points >= tickets
  }

  if (participant.eligible) {
    if (raffle.type === TYPE_TICKETS) global.users.set(sender.username, { points: parseInt(user.points, 10) - parseInt(tickets, 10) })
    if (!global.configuration.getValue('disableRaffleWhispers')) global.commons.sendMessage(global.translate('raffle.participation.success'), sender)

    global.db.engine.update('raffle_participants', { raffle_id: participant.raffle_id, username: sender.username }, participant)
  } else {
    if (!global.configuration.getValue('disableRaffleWhispers')) global.commons.sendMessage(global.translate('raffle.participation.failed'), sender)
  }
}

Raffles.prototype.info = async function (self, sender) {
  if (debug.enabled) debug('open(%j, %j)', self, sender)
  let raffle = await global.db.engine.findOne('raffles', { locked: false })

  if (_.isEmpty(raffle) || !_.isNull(raffle.winner)) {
    global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
    return
  }

  if (raffle.locked) {
    global.commons.sendMessage(global.translate('raffle.info.closed'), sender)
    return
  }

  let message
  let path = 'raffle.info.opened'

  if (raffle.eligibility === ELIGIBILITY_FOLLOWERS) path += '.followers'
  else if (raffle.eligibility === ELIGIBILITY_SUBSCRIBERS) path += '.subscribers'
  else path += '.everyone'

  if (raffle.product) path += 'AndProduct'
  if (raffle.type === TYPE_TICKETS) path += 'Tickets'

  message = global.translate(path)
    .replace(/\$keyword/g, raffle.keyword)
    .replace(/\$product/g, raffle.product)
    .replace(/\$min/g, raffle.minTickets)
    .replace(/\$max/g, raffle.maxTickets)

  if (raffle.minWatchedTime > 0) {
    message += ' ' + global.translate('raffle.minWatchedTime').replace(/\$time/g, raffle.minWatchedTime)
  }
  global.commons.sendMessage(message + '.', sender)
}

Raffles.prototype.open = async function (self, sender, text, dashboard = false) {
  if (debug.enabled) debug('open(%j, %j, %s, %s)', self, sender, text, dashboard)
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
    locked: false,
    participants: {}
  }

  // check if keyword is free
  let _raffle = await global.db.engine.findOne('raffles', { locked: false })
  if (global.parser.isRegistered(raffle.keyword) || !_.isEmpty(_raffle)) {
    global.commons.sendMessage(global.translate('core.isRegistered').replace(/\$keyword/g, '!' + raffle.keyword), sender)
    return
  }

  global.db.engine.update('raffles', {}, raffle)

  let message
  let path = 'raffle.open.ok'

  if (raffle.eligibility === ELIGIBILITY_FOLLOWERS) path += '.followers'
  else if (raffle.eligibility === ELIGIBILITY_SUBSCRIBERS) path += '.subscribers'
  else path += '.everyone'

  if (raffle.product) path += 'AndProduct'
  if (raffle.type === TYPE_TICKETS) path += 'Tickets'

  message = global.translate(path)
    .replace(/\$keyword/g, raffle.keyword)
    .replace(/\$product/g, raffle.product)
    .replace(/\$min/g, raffle.minTickets)
    .replace(/\$max/g, raffle.maxTickets)

  if (raffle.minWatchedTime > 0) {
    message += ' ' + global.translate('raffle.minWatchedTime').replace(/\$time/g, raffle.minWatchedTime)
  }
  global.commons.sendMessage(message + '.', sender)

  // register raffle keyword
  self.registerRaffleKeyword(self)
  self.lastAnnounce = new Date().getTime()
  if (global.configuration.getValue('raffleTitleTemplate').trim().length > 0) {
    self.status = global.twitch.current.status
    if (debug.enabled) debug('status %s', self.status)
    global.twitch.setTitle(global.twitch, null, self.status + ' ' + global.configuration.getValue('raffleTitleTemplate').replace(/\$product/g, !raffle.product ? ' ' : raffle.product).replace(/\$keyword/g, raffle.keyword))
  }
}

Raffles.prototype.close = async function (self, sender, text) {
  if (debug.enabled) debug('close(%j, %j, %s)', self, sender, text)
  if (!_.isNil(self.status)) {
    global.twitch.setTitle(global.twitch, null, self.status)
    self.status = null
  }

  let raffle = await global.db.engine.findOne('raffles', { locked: false })
  if (_.isEmpty(raffle)) {
    global.commons.sendMessage(global.translate('raffle.close.notRunning'), sender)
    return
  }

  global.db.engine.update('raffles', { locked: false }, { locked: true, timestamp: new Date().getTime() })
  global.commons.sendMessage(global.translate('raffle.close.ok'), sender)
  clearInterval(self.timer)
  global.parser.unregister(raffle.keyword)
  if (debug.enabled) debug('Raffle closed\n  %j', raffle)
}

module.exports = new Raffles()
