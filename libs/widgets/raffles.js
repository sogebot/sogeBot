'use strict'

var _ = require('lodash')
var log = global.log
var constants = require('../constants')

function RafflesWidget () {
  if (!global.commons.isSystemEnabled('raffles')) return

  this.participants = 0
  this.winner = null

  global.panel.addWidget('raffles', 'widget-title-raffles', 'knight')

  global.panel.socketListening(this, 'getRafflesParticipants', this.forceSendRaffleParticipants)
  global.panel.socketListening(this, 'switchEligibility', this.setEligibility)
  global.panel.socketListening(this, 'searchRafflesParticipants', this.searchRafflesParticipants)
  global.panel.socketListening(this, 'getRaffle', this.getRaffle)
  global.panel.socketListening(this, 'setRafflesFollowersOnly', this.setRafflesFollowersOnly)
  global.panel.socketListening(this, 'clearRaffleParticipants', this.clearRaffleParticipants)
  global.panel.socketListening(this, 'createRaffle', this.createRaffle)
  global.panel.socketListening(this, 'removeRaffle', this.removeRaffle)
  global.panel.socketListening(this, 'rafflesRollWinner', this.rafflesRollWinner)
  global.panel.socketListening(this, 'getRafflesConfiguration', this.sendConfiguration)

  global.parser.registerParser(this, 'rafflesMessages', this.rafflesMessages, constants.VIEWERS)

  var self = this
  setInterval(function () {
    self.sendRafflesParticipants(self)
    self.sendRafflesMessages(self)
  }, 1000)
}

RafflesWidget.prototype.sendConfiguration = function (self, socket) {
  socket.emit('rafflesConfiguration', {
    raffleAnnounceInterval: global.configuration.getValue('raffleAnnounceInterval'),
    raffleAnnounceCustomMessage: global.configuration.getValue('raffleAnnounceCustomMessage'),
    raffleTitleTemplate: global.configuration.getValue('raffleTitleTemplate')
  })
}

RafflesWidget.prototype.rafflesMessages = async function (self, id, sender, text) {
  if (!_.isNull(self.winner) && self.winner.username === sender.username) {
    let winner = await global.db.engine.findOne('raffle_participants', { username: self.winner.username })
    winner.messages.push({
      timestamp: sender['sent-ts'],
      text: text
    })
    await global.db.engine.update('raffle_participants', { username: self.winner.username }, winner)
  }
  global.updateQueue(id, true)
}

RafflesWidget.prototype.forceSendRaffleParticipants = function (self, socket) {
  self.participants = 0
}

RafflesWidget.prototype.rafflesRollWinner = function (self, socket) {
  global.systems.raffles.pick(global.systems.raffles, {username: null})
}

RafflesWidget.prototype.sendWinner = function (self, user) {
  self.winner = user
  global.panel.io.emit('raffleWinner', user)
}

RafflesWidget.prototype.removeRaffle = function (self, socket) {
  global.botDB.remove({ _id: 'raffle' }, { multi: true })
  self.clearRaffleParticipants(self, socket)
  global.parser.unregister('!' + global.systems.raffles.keyword)
  global.systems.raffles.keyword = null

  if (!_.isNil(global.systems.raffles.status)) {
    global.twitch.setTitle(global.twitch, null, global.systems.raffles.status)
    global.systems.raffles.status = null
  }
}

RafflesWidget.prototype.clearRaffleParticipants = function (self, socket) {
  global.systems.raffles.participants = {}
  self.forceSendRaffleParticipants(self)
  socket.emit('rafflesParticipants', {})
}

RafflesWidget.prototype.sendRafflesMessages = async function (self) {
  if (_.isNil(self.winner)) return
  let winner = await global.db.engine.findOne('raffle_participants', { username: self.winner.username })
  global.panel.io.emit('rafflesMessages', winner.messages)
}

RafflesWidget.prototype.sendRafflesParticipants = function (self) {
  if (_.size(global.systems.raffles.participants) !== self.participants) global.panel.io.emit('rafflesParticipants', global.systems.raffles.participants)
  self.participants = _.size(global.systems.raffles.participants)
}

RafflesWidget.prototype.createRaffle = function (self, socket, data) {
  let eligibility = ''
  let type = 'keyword'
  if (data.eligibility === 0) eligibility = 'followers'
  if (data.eligibility === 1) eligibility = 'subscribers'
  if (data.type === 1) type = 'tickets'
  global.systems.raffles.open(global.systems.raffles, {username: null},
    data.keyword.trim() + (data.product ? ' ' + data.product.trim() : '') +
    (data.minWatchedTime ? ' time=' + data.minWatchedTime.trim() : '') +
    (data.type ? ' type=' + type : '') +
    (data.minTickets ? ' min=' + data.minTickets : '') +
    (data.maxTickets ? ' max=' + data.maxTickets : '') +
    ' ' + eligibility, true)
}

RafflesWidget.prototype.searchRafflesParticipants = function (self, socket, data) {
  global.panel.io.emit('rafflesParticipants',
    _.filter(_.clone(global.systems.raffles.participants), function (o) {
      return o.username.startsWith(data.trim())
    })
  )
}

RafflesWidget.prototype.getRaffle = function (self, socket) {
  global.botDB.findOne({ _id: 'raffle' }, function (err, item) {
    if (err) log.error(err, { fnc: 'RafflesWidget.prototype.getRaffle' })
    socket.emit('raffle', item)
  })
}

RafflesWidget.prototype.setEligibility = function (self, socket, data) {
  global.systems.raffles.participants[data.username].eligible = true
}

RafflesWidget.prototype.setRafflesFollowersOnly = function (self, socket, followersOnly) {
  global.botDB.update({ _id: 'raffle' }, { $set: { followers: followersOnly } })

  // update elegibility
  global.botDB.find({ $where: function () { return this._id.startsWith('raffle_participant_') } }, function (err, items) {
    if (err) { log.error(err, { fnc: 'RafflesWidget.prototype.setRafflesFollowersOnly' }); return err }
    _.each(items, function (item) {
      if (item.forced === false) { // update non-forced only
        if (!followersOnly && item.eligible === false) { // update only if neccessary
          item.eligible = true
          global.botDB.update({ _id: item._id }, item)
          self.forceSendRaffleParticipants(self)
        } else {
          const user = global.users.get(item.username)
          item.eligible = _.isUndefined(user.is.follower) ? false : user.is.follower
          global.botDB.update({ _id: item._id }, item)
          self.forceSendRaffleParticipants(self)
        }
      }
    })
  })
}

module.exports = new RafflesWidget()
