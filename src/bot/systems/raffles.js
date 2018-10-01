'use strict'

// 3rdparty libraries
const _ = require('lodash')
const cluster = require('cluster')
// bot libraries
var constants = require('../constants')
const System = require('./_interface')

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
 */

class Raffles extends System {
  constructor () {
    const settings = {
      _: {
        lastAnnounce: String(new Date())
      },
      luck: {
        subscribersPercent: 150,
        followersPercent: 120
      },
      raffleAnnounceInterval: 10,
      commands: [
        { name: '!raffle pick', permission: constants.OWNER_ONLY },
        { name: '!raffle remove', permission: constants.OWNER_ONLY },
        { name: '!raffle open', permission: constants.OWNER_ONLY },
        '!raffle'
      ],
      parsers: [
        { name: 'messages', fireAndForget: true },
        { name: 'participate' }
      ]
    }
    super({ settings })
    this.addWidget('raffles', 'widget-title-raffles', 'fas fa-gift')

    if (cluster.isMaster) {
      this.announce()

      cluster.on('message', (worker, message) => {
        if (message.type !== 'raffles') return
        this[message.fnc](this)
      })
    }
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('pick', async (cb) => {
        this.pick()
      })
      socket.on('open', async (message) => {
        this.open({ username: global.commons.getOwner(), parameters: message })
      })
      socket.on('close', async () => {
        global.db.engine.remove(this.collection.data, {})
        global.db.engine.remove(this.collection.participants, {})
      })
    })
  }

  async messages (opts) {
    if (opts.skip) return true

    let raffles = await global.db.engine.find(this.collection.data)
    if (_.isEmpty(raffles)) {
      return true
    }

    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]

    let isWinner = !_.isNil(raffle.winner) && raffle.winner === opts.sender.username
    let isInFiveMinutesTreshold = _.now() - raffle.timestamp <= 1000 * 60 * 5

    if (isWinner && isInFiveMinutesTreshold) {
      let winner = await global.db.engine.findOne(this.collection.participants, { username: opts.sender.username, raffle_id: raffle._id.toString() })
      winner.messages.push({
        timestamp: _.now(),
        text: opts.message
      })
      await global.db.engine.update(this.collection.participants, { username: opts.sender.username, raffle_id: raffle._id.toString() }, { messages: winner.messages })
    }
    return true
  }

  async announce () {
    clearTimeout(this.timeouts['raffleAnnounce'])
    let raffle = await global.db.engine.findOne(this.collection.data, { winner: null })
    if (!await global.cache.isOnline() || _.isEmpty(raffle) || new Date().getTime() - new Date(await this.settings._.lastAnnounce).getTime() < ((await this.settings.raffleAnnounceInterval) * 60 * 1000)) {
      this.timeouts['raffleAnnounce'] = setTimeout(() => this.announce(), 60000)
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
    global.commons.sendMessage(message, global.commons.getOwner())

    this.timeouts['raffleAnnounce'] = setTimeout(() => this.announce(), 60000)
  }

  async remove (self) {
    let raffle = await global.db.engine.findOne(this.collection.data, { winner: null })
    if (_.isEmpty(raffle)) return

    await Promise.all([
      global.db.engine.remove(this.collection.data, { _id: raffle._id.toString() }),
      global.db.engine.remove(this.collection.participants, { raffle_id: raffle._id.toString() })
    ])

    self.refresh()
  }

  async open (opts) {
    let [followers, subscribers] = [opts.parameters.indexOf('followers') >= 0, opts.parameters.indexOf('subscribers') >= 0]
    let type = (opts.parameters.indexOf('-min') >= 0 || opts.parameters.indexOf('-max') >= 0) ? TYPE_TICKETS : TYPE_NORMAL
    if (!(await global.systems.points.isEnabled())) type = TYPE_NORMAL // force normal type if points are disabled

    let minTickets = 0
    let maxTickets = 100

    if (type === TYPE_TICKETS) {
      let match
      match = opts.parameters.match(/-min (\d+)/)
      if (!_.isNil(match)) minTickets = match[1]

      match = opts.parameters.match(/-max (\d+)/)
      if (!_.isNil(match)) maxTickets = match[1]
    }

    let keyword = opts.parameters.match(/(![\S]+)/)
    if (_.isNil(keyword)) {
      let message = await global.commons.prepare('raffles.cannot-create-raffle-without-keyword')
      global.commons.sendMessage(message, opts.sender)
      return
    }
    keyword = keyword[1]

    // check if raffle running
    let raffle = await global.db.engine.findOne(this.collection.data, { winner: null })
    if (!_.isEmpty(raffle)) {
      let message = await global.commons.prepare('raffles.raffle-is-already-running', { keyword: raffle.keyword })
      global.commons.sendMessage(message, opts.sender)
      return
    }

    await Promise.all([
      global.db.engine.insert(this.collection.data, {
        keyword: keyword,
        followers: followers,
        subscribers: subscribers,
        min: minTickets,
        max: maxTickets,
        type: type,
        winner: null,
        timestamp: _.now()
      }),
      global.db.engine.remove(this.collection.participants, {})
    ])

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
    global.commons.sendMessage(message, global.commons.getOwner())

    this.settings._.lastAnnounce = String(new Date())
  }

  async main (opts) {
    let raffle = await global.db.engine.findOne(this.collection.data, { winner: null })

    if (_.isEmpty(raffle)) {
      let message = await global.commons.prepare('raffles.no-raffle-is-currently-running')
      global.commons.sendMessage(message, opts.sender)
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
    global.commons.sendMessage(message, global.commons.getOwner())
  }

  async participate (opts) {
    if (_.isNil(opts.sender) || _.isNil(opts.sender.username)) return true

    const [raffle, user] = await Promise.all([global.db.engine.findOne(this.collection.data, { winner: null }), global.users.getByName(opts.sender.username)])
    if (_.isEmpty(raffle)) return true

    const isStartingWithRaffleKeyword = opts.message.toLowerCase().startsWith(raffle.keyword.toLowerCase())
    if (!isStartingWithRaffleKeyword || _.isEmpty(raffle)) return true

    opts.message = opts.message.toString().replace(raffle.keyword, '')
    let tickets = opts.message.trim() === 'all' && !_.isNil(await global.systems.points.getPointsOf(opts.sender.userId)) ? await global.systems.points.getPointsOf(opts.sender.userId) : parseInt(opts.message.trim(), 10)

    if (_.isEmpty(raffle)) { // shouldn't happen, but just to be sure (user can join when closing raffle)
      let message = await global.commons.prepare('no-raffle-is-currently-running')
      global.commons.sendMessage(message, opts.sender)
      return false
    }

    if ((!_.isFinite(tickets) || tickets <= 0 || tickets > parseInt(raffle.max, 10) || tickets < parseInt(raffle.min, 10)) && raffle.type === TYPE_TICKETS) {
      return false
    }
    if (!_.isFinite(tickets)) tickets = 0

    let participant = await global.db.engine.findOne(this.collection.participants, { raffle_id: raffle._id.toString(), username: opts.sender.username })
    let curTickets = 0
    if (!_.isEmpty(participant)) {
      curTickets = parseInt(participant.tickets, 10)
    }
    let newTickets = curTickets + tickets

    if (newTickets > raffle.max) { newTickets = raffle.max }
    tickets = newTickets - curTickets

    let participantUser = {
      eligible: !_.isEmpty(participant) ? participant.eligible : true, // get latest eligible to not bypass winner/manual set false
      tickets: raffle.type === TYPE_NORMAL ? 1 : parseInt(newTickets, 10),
      username: opts.sender.username,
      messages: [],
      is: user.is,
      raffle_id: raffle._id.toString()
    }
    if (raffle.type === TYPE_TICKETS && await global.systems.points.getPointsOf(opts.sender.userId) < tickets) return // user doesn't have enough points

    if (raffle.followers && raffle.subscribers) {
      participantUser.eligible = (!_.isNil(user.is.follower) && user.is.follower) || (!_.isNil(user.is.subscriber) && user.is.subscriber)
    } else if (raffle.followers) {
      participantUser.eligible = !_.isNil(user.is.follower) && user.is.follower
    } else if (raffle.subscribers) {
      participantUser.eligible = !_.isNil(user.is.subscriber) && user.is.subscriber
    }

    if (participantUser.eligible) {
      if (raffle.type === TYPE_TICKETS) await global.db.engine.insert('users.points', { id: opts.sender.userId, points: parseInt(tickets, 10) * -1 })
      await global.db.engine.update(this.collection.participants, { raffle_id: raffle._id.toString(), username: opts.sender.username }, participantUser)
    }
    return true
  }

  async pick () {
    let raffles = await global.db.engine.find(this.collection.data)
    if (_.size(raffles) === 0) return true // no raffle ever

    // get only latest raffle
    let raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]

    let participants = await global.db.engine.find(this.collection.participants, { raffle_id: raffle._id.toString(), eligible: true })
    if (participants.length === 0) {
      let message = await global.commons.prepare('raffles.no-participants-to-pick-winner')
      global.commons.sendMessage(message, global.commons.getOwner())
      return true
    }

    let _total = 0
    let [fLuck, sLuck] = await Promise.all([this.settings.luck.followersPercent, this.settings.luck.subscribersPercent])
    for (let participant of _.filter(participants, (o) => o.eligible)) {
      if (!_.isNil(participant.is) && (participant.is.follower || participant.is.subscriber)) {
        if (participant.is.subscriber) {
          _total = _total + parseInt(((participant.tickets / 100) * sLuck), 10)
        } else if (participant.is.follower) {
          _total = _total + parseInt(((participant.tickets / 100) * fLuck), 10)
        }
      } else {
        _total = _total + parseInt(participant.tickets, 10)
      }
    }

    _total = parseInt(_total, 10)
    let winNumber = _.random(0, _total - 1, false)
    let winner
    for (let participant of _.filter(participants, (o) => o.eligible)) {
      let tickets = participant.tickets

      if (!_.isNil(participant.is) || (participant.is.follower && participant.is.subscriber)) {
        if (participant.is.subscriber) {
          tickets = parseInt(((participant.tickets / 100) * sLuck), 10)
        } else if (participant.is.follower) {
          tickets = parseInt(((participant.tickets / 100) * fLuck), 10)
        }
      }

      winNumber = winNumber - tickets
      winner = participant
      if (winNumber <= 0) {
        break
      }
    }

    let tickets = winner.tickets
    if (!_.isNil(winner.is) || (winner.is.follower && winner.is.subscriber)) {
      if (winner.is.subscriber) {
        tickets = parseInt(((winner.tickets / 100) * sLuck), 10)
      } else if (winner.is.follower) {
        tickets = parseInt(((winner.tickets / 100) * fLuck), 10)
      }
    }

    let probability = (parseInt(tickets, 10) / (parseInt(_total, 10)) * 100)

    // uneligible winner (don't want to pick second time same user if repick)
    await Promise.all([
      global.db.engine.update(this.collection.participants, { raffle_id: raffle._id.toString(), username: winner.username }, { eligible: false }),
      global.db.engine.update(this.collection.data, { _id: raffle._id.toString() }, { winner: winner.username, timestamp: new Date().getTime() })
    ])

    let message = await global.commons.prepare('raffles.raffle-winner-is', {
      username: winner.username,
      keyword: raffle.keyword,
      probability: _.round(probability, 2)
    })
    global.commons.sendMessage(message, global.commons.getOwner())
  }
}

module.exports = new Raffles()
