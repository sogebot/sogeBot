'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
// debug
const debug = require('debug')('systems:raffles')

const TYPE_NORMAL = 0
const TYPE_TICKETS = 1

/*
 * !raffle                               - gets an info about raffle
 * !raffle open ![raffle-keyword] [-min #?] [-max #?] [-for followers,subscribers?]
 *                                       - open a new raffle with selected keyword,
 *                                       - -min # - minimal of tickets to join, -max # - max of tickets to join -> ticket raffle
 *                                       - -for followers,subscribers - who can join raffle, if empty -> everyone
 * !raffle pick                          - pick or repick a winner of raffle
 * ![raffle-keyword]                     - join a raffle
 * !set raffleAnnounceInterval [minutes] - reannounce raffle interval each x minutes
 */

class Raffles {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      this.status = null
      this.lastAnnounce = _.now()

      global.parser.register(this, '!raffle pick', this.pick, constants.OWNER_ONLY)
      global.parser.register(this, '!raffle close', this.close, constants.OWNER_ONLY)
      global.parser.register(this, '!raffle open', this.open, constants.OWNER_ONLY)
      global.parser.register(this, '!raffle', this.info, constants.VIEWERS)
      global.parser.registerHelper('!raffle')

      global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)

      global.parser.registerParser(this, 'rafflesMessages', this.messages, constants.VIEWERS)

      this.register()
      this.announce()
    }
  }

  async messages (self, id, sender, text) {
    debug('# MESSAGE PARSER')
    let raffles = await global.db.engine.find('raffles')
    debug('Raffles: %o', raffles)
    if (_.isEmpty(raffles)) {
      global.updateQueue(id, true)
      return
    }

    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
    debug('Selected raffle: %o', raffle)

    let isWinner = !_.isNil(raffle.winner) && raffle.winner === sender.username
    let isInTwoMinutesTreshold = _.now() - raffle.timestamp <= 1000 * 60 * 2

    debug('current time: %s, raffle pick time: %s, diff: %s', _.now(), raffle.timestamp, _.now() - raffle.timestamp)
    debug('Is raffle in 2 minutes treshold: %s', isInTwoMinutesTreshold)
    debug('Is user a winner: %s', isWinner)
    if (isWinner && isInTwoMinutesTreshold) {
      let winner = await global.db.engine.findOne('raffle_participants', { username: sender.username, raffle_id: raffle._id })
      winner.messages.push({
        timestamp: sender['sent-ts'],
        text: text
      })
      debug({ username: sender.username, raffle_id: raffle._id }, { messages: winner.messages })
      await global.db.engine.update('raffle_participants', { username: sender.username, raffle_id: raffle._id }, { messages: winner.messages })
    }
    global.updateQueue(id, true)
  }

  async announce () {
    let raffle = await global.db.engine.findOne('raffles', { winner: null })
    if (_.isEmpty(raffle) || _.now() - this.lastAnnounce < (global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000)) {
      setTimeout(() => this.announce(), 60000)
      return
    }

    this.lastAnnounce = _.now()

    let locale = 'raffles.announce-raffle'
    if (raffle.type === TYPE_TICKETS) locale = 'raffles.announce-ticket-raffle'

    let eligibility = []
    if (raffle.followers === true) eligibility.push(global.commons.prepare('raffles.eligibility-followers-item'))
    if (raffle.subscribers === true) eligibility.push(global.commons.prepare('raffles.eligibility-subscribers-item'))
    if (_.isEmpty(eligibility)) eligibility.push(global.commons.prepare('raffles.eligibility-everyone-item'))

    let message = global.commons.prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.min,
      max: raffle.max,
      eligibility: eligibility.join(', ')
    })
    debug(message); global.commons.sendMessage(message, global.parser.getOwner())

    this.register()
    setTimeout(() => this.announce(), 60000)
  }

  async register () {
    let raffle = await global.db.engine.findOne('raffles', { winner: null })
    if (_.isEmpty(raffle)) return
    global.parser.unregister(raffle.keyword)
    global.parser.register(this, raffle.keyword, this.participate, constants.VIEWERS)
  }

  async open (self, sender, text, dashboard = false) {
    let [followers, subscribers] = [text.indexOf('followers') >= 0, text.indexOf('subscribers') >= 0]
    let type = (text.indexOf('-min') >= 0 || text.indexOf('-max') >= 0) ? TYPE_TICKETS : TYPE_NORMAL
    if (!global.commons.isSystemEnabled('points')) type = TYPE_NORMAL // force normal type if points are disabled

    let minTickets = 0
    let maxTickets = 100

    if (type === TYPE_TICKETS) {
      let match
      match = text.match(/-min (\d+)/)
      if (!_.isNil(match)) minTickets = match[1]

      match = text.match(/-max (\d+)/)
      if (!_.isNil(match)) maxTickets = match[1]
    }

    let keyword = text.match(/(![\S]+)/)
    if (_.isNil(keyword)) {
      let message = global.commons.prepare('raffles.cannot-create-raffle-without-keyword')
      debug(message); global.commons.sendMessage(message)
      return
    }
    keyword = keyword[1]

    // check if keyword is free
    if (global.parser.isRegistered(keyword)) {
      let message = global.commons.prepare('core.isRegistered', { keyword: keyword })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    // check if raffle running
    let raffle = await global.db.engine.findOne('raffles', { winner: null })
    if (!_.isEmpty(raffle)) {
      let message = global.commons.prepare('raffles.raffle-is-already-running', { keyword: raffle.keyword })
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    global.db.engine.insert('raffles', {
      keyword: keyword,
      followers: followers,
      subscribers: subscribers,
      min: minTickets,
      max: maxTickets,
      type: type,
      winner: null,
      timestamp: _.now()
    })

    let eligibility = []
    if (followers) eligibility.push(global.commons.prepare('raffles.eligibility-followers-item'))
    if (subscribers) eligibility.push(global.commons.prepare('raffles.eligibility-subscribers-item'))
    if (_.isEmpty(eligibility)) eligibility.push(global.commons.prepare('raffles.eligibility-everyone-item'))

    let message = global.commons.prepare(type === TYPE_NORMAL ? 'raffles.announce-raffle' : 'raffles.announce-ticket-raffle', {
      keyword: keyword,
      eligibility: eligibility.join(', '),
      min: minTickets,
      max: maxTickets
    })
    debug(message); global.commons.sendMessage(message, sender)

    // register raffle keyword
    self.register()
    self.lastAnnounce = _.now()
  }

  async info (self, sender) {
    let raffle = await global.db.engine.findOne('raffles', { winner: null })

    if (_.isEmpty(raffle)) {
      let message = global.commons.prepare('raffles.no-raffle-is-currently-running')
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    let locale = 'raffles.announce-raffle'
    if (raffle.type === TYPE_TICKETS) locale = 'raffles.announce-ticket-raffle'

    let eligibility = []
    if (raffle.followers === true) eligibility.push(global.commons.prepare('raffles.eligibility-followers-item'))
    if (raffle.subscribers === true) eligibility.push(global.commons.prepare('raffles.eligibility-subscribers-item'))
    if (_.isEmpty(eligibility)) eligibility.push(global.commons.prepare('raffles.eligibility-everyone-item'))

    let message = global.commons.prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.min,
      max: raffle.max,
      eligibility: eligibility.join(', ')
    })
    debug(message); global.commons.sendMessage(message, global.parser.getOwner())
  }

  async participate (self, sender, text) {
    let tickets = parseInt(text.trim(), 10)

    let raffle = await global.db.engine.findOne('raffles', { winner: null })
    if (_.isEmpty(raffle)) { // shouldn't happen, but just to be sure (user can join when closing raffle)
      let message = global.commons.prepare('no-raffle-is-currently-running')
      debug(message); global.commons.sendMessage(message, sender)
      return true
    }

    if ((!_.isFinite(tickets) || tickets <= 0 || tickets > parseInt(raffle.max, 10) || tickets < parseInt(raffle.min, 10)) && raffle.type === TYPE_TICKETS) {
      return true
    }
    if (!_.isFinite(tickets)) tickets = 0

    let participant = await global.db.engine.findOne('raffle_participants', { raffle_id: raffle._id, username: sender.username })
    let curTickets = 0
    if (!_.isEmpty(participant)) {
      debug(participant)
      curTickets = parseInt(participant.tickets, 10)
    }
    let newTickets = curTickets + tickets
    debug('current tickets: %d', curTickets)
    debug('new tickets: %d', tickets)
    debug('tickets to set: %d', newTickets)

    if (newTickets > raffle.max) { newTickets = raffle.max }
    tickets = newTickets - curTickets

    let participantUser = {
      eligible: !_.isEmpty(participant) ? participant.eligible : true, // get latest eligible to not bypass winner/manual set false
      tickets: raffle.type === TYPE_NORMAL ? 1 : parseInt(newTickets, 10),
      username: sender.username,
      messages: [],
      raffle_id: raffle._id
    }
    debug('new participant: %j', participantUser)

    const user = await global.users.get(sender.username)
    debug('not enough points: %o', raffle.type === TYPE_TICKETS && user.points < tickets)
    if (raffle.type === TYPE_TICKETS && user.points < tickets) return // user doesn't have enough points

    if (raffle.followers && raffle.subscribers) {
      participantUser.eligible = (!_.isNil(user.is.follower) && user.is.follower) || (!_.isNil(user.is.subscriber) && user.is.subscriber)
    } else if (raffle.followers) {
      participantUser.eligible = !_.isNil(user.is.follower) && user.is.follower
    } else if (raffle.subscribers) {
      participantUser.eligible = !_.isNil(user.is.subscriber) && user.is.subscriber
    }

    if (participantUser.eligible) {
      if (raffle.type === TYPE_TICKETS) global.db.engine.increment('users', { username: sender.username }, { points: parseInt(tickets, 10) * -1 })
      global.db.engine.update('raffle_participants', { raffle_id: raffle._id, username: sender.username }, participantUser)
    }
  }

  async pick (self, sender) {
    let raffles = await global.db.engine.find('raffles')
    if (_.size(raffles) === 0) return true // no raffle ever

    // get only latest raffle
    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
    debug('Picking winner for raffle\n  %j', raffle)

    let participants = await global.db.engine.find('raffle_participants', { raffle_id: raffle._id })
    if (participants.length === 0) {
      let message = global.commons.prepare('raffles.no-participants-to-pick-winner')
      debug(message); global.commons.sendMessage(message, sender)
      return true
    }

    let winnerArray = []
    let _total = 0
    _.each(participants, function (dict) {
      if (!dict.eligible) return true
      _total = _total + parseInt(dict.tickets)
      for (let i = 0; i < dict.tickets; i++) {
        winnerArray.push(dict.username)
      }
    })
    if (debug.enabled) debug('winnerArray: %j', winnerArray)

    let winner = winnerArray[_.random(0, parseInt(_total, 10) - 1, false)]

    let participant = _.find(participants, (o) => o.username === winner)
    if (debug.enabled) debug('winner participant: %j', participant)
    let probability = parseInt(participant.tickets, 10) / (parseInt(_total, 10) / 100)

    // uneligible winner (don't want to pick second time same user if repick)
    await Promise.all([
      global.db.engine.update('raffle_participants', { raffle_id: raffle._id, username: winner }, { eligible: false }),
      global.db.engine.update('raffles', { _id: raffle._id }, { winner: winner, timestamp: new Date().getTime() })
    ])

    let message = global.commons.prepare('raffles.raffle-winner-is', {
      username: winner,
      keyword: raffle.keyword,
      probability: _.round(probability, 2)
    })
    debug(message); global.commons.sendMessage(message, sender)

    global.parser.unregister(raffle.keyword) // disable raffle keyword on pick
  }
}

module.exports = new Raffles()
