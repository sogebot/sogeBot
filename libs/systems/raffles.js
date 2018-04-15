'use strict'

// 3rdparty libraries
const _ = require('lodash')
const cluster = require('cluster')
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
 * !raffle remove                        - remove raffle without winner
 * !raffle pick                          - pick or repick a winner of raffle
 * ![raffle-keyword]                     - join a raffle
 * !set raffleAnnounceInterval [minutes] - reannounce raffle interval each x minutes
 */

class Raffles {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      this.lastAnnounce = _.now()

      global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)

      if (cluster.isMaster) {
        global.panel.registerSockets({
          self: this,
          expose: ['refresh', 'remove', 'eligibility', 'open', 'pick'],
          finally: this.refresh
        })

        global.panel.addWidget('raffles', 'widget-title-raffles', 'fas fa-gift')

        this.announce()
        this.refresh()

        cluster.on('message', (worker, message) => {
          if (message.type !== 'raffles') return
          this[message.fnc](this)
        })
      }
    }
  }

  commands () {
    return !global.commons.isSystemEnabled('raffles')
      ? []
      : [
        {this: this, command: '!raffle pick', fnc: this.pick, permission: constants.OWNER_ONLY},
        {this: this, command: '!raffle close', fnc: this.close, permission: constants.OWNER_ONLY},
        {this: this, command: '!raffle remove', fnc: this.remove, permission: constants.OWNER_ONLY},
        {this: this, command: '!raffle open', fnc: this.open, permission: constants.OWNER_ONLY},
        {this: this, command: '!raffle', fnc: this.info, permission: constants.VIEWERS}
      ]
  }

  parsers () {
    return !global.commons.isSystemEnabled('raffles')
      ? []
      : [
        {this: this, name: 'raffle_winner_messages', fnc: this.messages, permission: constants.VIEWERS, priority: constants.LOW, fireAndForget: true},
        {this: this, name: 'raffle_participate', fnc: this.participate, permission: constants.VIEWERS, priority: constants.LOW}
      ]
  }

  async refresh (self) {
    if (cluster.isWorker) return process.send({type: 'raffles', fnc: 'refresh'})

    debug('[WIDGET REFRESH]')
    const SOCKET = global.panel.io

    let raffles = await global.db.engine.find('raffles')
    debug('Raffles: %o', raffles)
    if (_.isEmpty(raffles)) {
      SOCKET.emit('raffles.refresh.data', { raffle: null, participants: null })
      return
    }

    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
    debug('Selected raffle: %o', raffle)

    let participants = await global.db.engine.find('raffle_participants', { raffle_id: raffle._id.toString() })
    debug('Raffle participants: %o', participants)

    let winner = null
    if (!_.isNil(raffle.winner)) winner = await global.users.get(raffle.winner)
    debug('Raffle winner: %o', winner)

    let messages = []
    if (!_.isNil(raffle.winner)) {
      let participant = await global.db.engine.findOne('raffle_participants', { raffle_id: raffle._id.toString(), username: raffle.winner })
      messages = participant.messages
    }
    debug('winner messages: %O', messages)

    SOCKET.emit('raffles.refresh.data', {
      raffle: raffle,
      participants: participants,
      winner: winner,
      messages: messages
    })
  }

  async messages (self, sender, text, skip) {
    if (skip) return true

    debug('[MESSAGE PARSER]')
    let raffles = await global.db.engine.find('raffles')
    debug('Raffles: %o', raffles)
    if (_.isEmpty(raffles)) {
      return true
    }

    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
    debug('Selected raffle: %o', raffle)

    let isWinner = !_.isNil(raffle.winner) && raffle.winner === sender.username
    let isInTwoMinutesTreshold = _.now() - raffle.timestamp <= 1000 * 60 * 2

    debug('current time: %s, raffle pick time: %s, diff: %s', _.now(), raffle.timestamp, _.now() - raffle.timestamp)
    debug('Is raffle in 2 minutes treshold: %s', isInTwoMinutesTreshold)
    debug('Is user a winner: %s', isWinner)
    if (isWinner && isInTwoMinutesTreshold) {
      let winner = await global.db.engine.findOne('raffle_participants', { username: sender.username, raffle_id: raffle._id.toString() })
      winner.messages.push({
        timestamp: _.now(),
        text: text
      })
      debug({ username: sender.username, raffle_id: raffle._id.toString() }, { messages: winner.messages })
      await global.db.engine.update('raffle_participants', { username: sender.username, raffle_id: raffle._id.toString() }, { messages: winner.messages })
      self.refresh()
    }
    return true
  }

  async announce () {
    let raffle = await global.db.engine.findOne('raffles', { winner: null })
    if (_.isEmpty(raffle) || _.now() - this.lastAnnounce < (await global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000)) {
      setTimeout(() => this.announce(), 60000)
      return
    }

    this.lastAnnounce = _.now()

    let locale = 'raffles.announce-raffle'
    if (raffle.type === TYPE_TICKETS) locale = 'raffles.announce-ticket-raffle'

    let eligibility = []
    if (raffle.followers === true) eligibility.push(await global.commons.prepare('raffles.eligibility-followers-item'))
    if (raffle.subscribers === true) eligibility.push(await global.commons.prepare('raffles.eligibility-subscribers-item'))
    if (_.isEmpty(eligibility)) eligibility.push(await global.commons.prepare('raffles.eligibility-everyone-item'))

    let message = await global.commons.prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.min,
      max: raffle.max,
      eligibility: eligibility.join(', ')
    })
    debug(message); global.commons.sendMessage(message, global.commons.getOwner())

    setTimeout(() => this.announce(), 60000)
  }

  async remove (self) {
    let raffle = await global.db.engine.findOne('raffles', { winner: null })
    if (_.isEmpty(raffle)) return

    await Promise.all([
      global.db.engine.remove('raffles', { _id: raffle._id.toString() }),
      global.db.engine.remove('raffle_participants', { raffle_id: raffle._id.toString() })
    ])

    self.refresh()
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
      let message = await global.commons.prepare('raffles.cannot-create-raffle-without-keyword')
      debug(message); global.commons.sendMessage(message)
      return
    }
    keyword = keyword[1]

    // check if raffle running
    let raffle = await global.db.engine.findOne('raffles', { winner: null })
    if (!_.isEmpty(raffle)) {
      let message = await global.commons.prepare('raffles.raffle-is-already-running', { keyword: raffle.keyword })
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
    if (followers) eligibility.push(await global.commons.prepare('raffles.eligibility-followers-item'))
    if (subscribers) eligibility.push(await global.commons.prepare('raffles.eligibility-subscribers-item'))
    if (_.isEmpty(eligibility)) eligibility.push(await global.commons.prepare('raffles.eligibility-everyone-item'))

    let message = await global.commons.prepare(type === TYPE_NORMAL ? 'raffles.announce-raffle' : 'raffles.announce-ticket-raffle', {
      keyword: keyword,
      eligibility: eligibility.join(', '),
      min: minTickets,
      max: maxTickets
    })
    debug(message); global.commons.sendMessage(message, global.commons.getOwner())

    self.refresh()
    self.lastAnnounce = _.now()
  }

  async info (self, sender) {
    let raffle = await global.db.engine.findOne('raffles', { winner: null })

    if (_.isEmpty(raffle)) {
      let message = await global.commons.prepare('raffles.no-raffle-is-currently-running')
      debug(message); global.commons.sendMessage(message, sender)
      return
    }

    let locale = 'raffles.announce-raffle'
    if (raffle.type === TYPE_TICKETS) locale = 'raffles.announce-ticket-raffle'

    let eligibility = []
    if (raffle.followers === true) eligibility.push(await global.commons.prepare('raffles.eligibility-followers-item'))
    if (raffle.subscribers === true) eligibility.push(await global.commons.prepare('raffles.eligibility-subscribers-item'))
    if (_.isEmpty(eligibility)) eligibility.push(await global.commons.prepare('raffles.eligibility-everyone-item'))

    let message = await global.commons.prepare(locale, {
      keyword: raffle.keyword,
      min: raffle.min,
      max: raffle.max,
      eligibility: eligibility.join(', ')
    })
    debug(message); global.commons.sendMessage(message, global.commons.getOwner())
  }

  async participate (self, sender, text) {
    if (_.isNil(sender) || _.isNil(sender.username)) return true

    const [raffle, user] = await Promise.all([global.db.engine.findOne('raffles', { winner: null }), global.users.get(sender.username)])

    const isStartingWithRaffleKeyword = text.startsWith(raffle.keyword)
    debug('isStartingWithRaffleKeyword: %s', isStartingWithRaffleKeyword)
    if (!isStartingWithRaffleKeyword || _.isEmpty(raffle)) return true

    text = text.toString().replace(raffle.keyword, '')
    let tickets = text.trim() === 'all' && !_.isNil(await global.systems.points.getPointsOf(user.username)) ? await global.systems.points.getPointsOf(user.username) : parseInt(text.trim(), 10)
    debug('User in db: %j', user)
    debug('Text: %s', text)
    debug('Tickets in text: %s', parseInt(text.trim(), 10))

    if (_.isEmpty(raffle)) { // shouldn't happen, but just to be sure (user can join when closing raffle)
      let message = await global.commons.prepare('no-raffle-is-currently-running')
      debug(message); global.commons.sendMessage(message, sender)
      return false
    }

    debug('Tickets to bet: %s', tickets)
    debug('Tickets are number: %s', _.isFinite(tickets))
    debug('Tickets <= 0: %s', tickets <= 0)
    if ((!_.isFinite(tickets) || tickets <= 0 || tickets > parseInt(raffle.max, 10) || tickets < parseInt(raffle.min, 10)) && raffle.type === TYPE_TICKETS) {
      return false
    }
    if (!_.isFinite(tickets)) tickets = 0

    let participant = await global.db.engine.findOne('raffle_participants', { raffle_id: raffle._id.toString(), username: sender.username })
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
      raffle_id: raffle._id.toString()
    }
    debug('new participant: %j', participantUser)

    debug('not enough points: %o', raffle.type === TYPE_TICKETS && await global.systems.points.getPointsOf(user.username) < tickets)
    if (raffle.type === TYPE_TICKETS && await global.systems.points.getPointsOf(user.username) < tickets) return // user doesn't have enough points

    if (raffle.followers && raffle.subscribers) {
      participantUser.eligible = (!_.isNil(user.is.follower) && user.is.follower) || (!_.isNil(user.is.subscriber) && user.is.subscriber)
    } else if (raffle.followers) {
      participantUser.eligible = !_.isNil(user.is.follower) && user.is.follower
    } else if (raffle.subscribers) {
      participantUser.eligible = !_.isNil(user.is.subscriber) && user.is.subscriber
    }

    if (participantUser.eligible) {
      if (raffle.type === TYPE_TICKETS) await global.db.engine.insert('users', { username: sender.username, points: parseInt(tickets, 10) * -1 })
      await global.db.engine.update('raffle_participants', { raffle_id: raffle._id.toString(), username: sender.username }, participantUser)
      self.refresh()
    }
    return true
  }

  async pick (self, sender) {
    let raffles = await global.db.engine.find('raffles')
    if (_.size(raffles) === 0) return true // no raffle ever

    // get only latest raffle
    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
    debug('Picking winner for raffle\n  %j', raffle)

    let participants = await global.db.engine.find('raffle_participants', { raffle_id: raffle._id.toString(), eligible: true })
    if (participants.length === 0) {
      let message = await global.commons.prepare('raffles.no-participants-to-pick-winner')
      debug(message); global.commons.sendMessage(message, global.commons.getOwner())
      return true
    }

    let _total = 0
    for (let participant of _.filter(participants, (o) => o.eligible)) {
      _total = _total + parseInt(participant.tickets, 10)
    }

    let winNumber = _.random(0, parseInt(_total, 10) - 1, false)
    debug('Total tickets: %s', _total)
    debug('Win number: %s', winNumber)

    let winner
    for (let participant of _.filter(participants, (o) => o.eligible)) {
      winNumber = winNumber - participant.tickets
      if (winNumber <= 0) {
        winner = participant
        break
      }
    }

    debug('Raffle winner: %s', winner)
    let probability = parseInt(winner.tickets, 10) / (parseInt(_total, 10) / 100)

    // uneligible winner (don't want to pick second time same user if repick)
    await Promise.all([
      global.db.engine.update('raffle_participants', { raffle_id: raffle._id.toString(), username: winner.username }, { eligible: false }),
      global.db.engine.update('raffles', { _id: raffle._id.toString() }, { winner: winner.username, timestamp: new Date().getTime() })
    ])

    let message = await global.commons.prepare('raffles.raffle-winner-is', {
      username: winner.username,
      keyword: raffle.keyword,
      probability: _.round(probability, 2)
    })
    debug(message); global.commons.sendMessage(message, global.commons.getOwner())

    self.refresh()
  }

  async eligibility (self, socket, data) {
    let raffles = await global.db.engine.find('raffles')
    if (_.isEmpty(raffles)) return
    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
    debug({ raffle_id: raffle._id.toString(), username: data.username }, { eligible: data.eligible })
    await global.db.engine.update('raffle_participants', { raffle_id: raffle._id.toString(), username: data.username }, { eligible: data.eligible })
  }
}

module.exports = new Raffles()
