'use strict'

var _ = require('lodash')
var log = global.log
var User = require('../user')

function RafflesWidget () {
  this.participants = 0

  global.panel.addWidget('raffles', 'Raffles', 'knight')

  global.panel.socketListening(this, 'getRafflesParticipants', this.forceSendRaffleParticipants)
  global.panel.socketListening(this, 'switchEligibility', this.setEligibility)
  global.panel.socketListening(this, 'searchRafflesParticipants', this.searchRafflesParticipants)
  global.panel.socketListening(this, 'getRaffle', this.getRaffle)
  global.panel.socketListening(this, 'setRafflesFollowersOnly', this.setRafflesFollowersOnly)
  global.panel.socketListening(this, 'clearRaffleParticipants', this.clearRaffleParticipants)
  global.panel.socketListening(this, 'createRaffle', this.createRaffle)
  global.panel.socketListening(this, 'removeRaffle', this.removeRaffle)
  global.panel.socketListening(this, 'rafflesRollWinner', this.rafflesRollWinner)

  var self = this
  setInterval(function () {
    self.sendRafflesParticipants(self, self.socket)
  }, 1000)
}

RafflesWidget.prototype.forceSendRaffleParticipants = function (self, socket) {
  self.participants = 0
}

RafflesWidget.prototype.rafflesRollWinner = function (self, socket) {
  global.systems.raffles.pick(global.systems.raffles, {username: null})
  global.botDB.findOne({ _id: 'raffle' }, function (err, item) {
    if (err) { log.error(err); return err }
    var user = new User(item.winner)
    user.isLoaded().then(function () {
      socket.emit('raffleWinner', user)
    })
  })
}

RafflesWidget.prototype.removeRaffle = function (self, socket) {
  global.botDB.remove({ _id: 'raffle' }, { multi: true })
  self.clearRaffleParticipants(self, socket)
  global.parser.unregister('!' + global.systems.raffles.keyword)
  global.systems.raffles.keyword = null
}

RafflesWidget.prototype.clearRaffleParticipants = function (self, socket) {
  global.botDB.remove({ $where: function () { return this._id.startsWith('raffle_participant_') } }, { multi: true })
  self.forceSendRaffleParticipants(self)
  socket.emit('rafflesParticipants', {})

}

RafflesWidget.prototype.sendRafflesParticipants = function (self) {
  global.botDB.find({ $where: function () { return this._id.startsWith('raffle_participant_') } }, function (err, items) {
    if (err) log.error(err)
    if (items.length !== self.participants) global.panel.io.emit('rafflesParticipants', items)
    self.participants = items.length
  })
}

RafflesWidget.prototype.createRaffle = function (self, socket, data) {
  global.systems.raffles.open(global.systems.raffles, {username: null}, data.keyword + (data.followers ? ' followers' : ''), true)
}

RafflesWidget.prototype.searchRafflesParticipants = function (self, socket, data) {
  global.botDB.find({ $where: function () { return this._id.startsWith('raffle_participant_' + data.trim()) } }, function (err, items) {
    if (err) log.error(err)
    if (items.length !== self.participants) global.panel.io.emit('rafflesParticipants', items)
  })
}

RafflesWidget.prototype.getRaffle = function (self, socket) {
  global.botDB.findOne({ _id: 'raffle' }, function (err, item) {
    if (err) log.error(err)
    socket.emit('raffle', item)
  })
}

RafflesWidget.prototype.setEligibility = function (self, socket, data) {
  global.botDB.update({ _id: 'raffle_participant_' + data.username }, { $set: { forced: true, eligible: (data.eligible.toLowerCase() === 'true') } })
}

RafflesWidget.prototype.setRafflesFollowersOnly = function (self, socket, followersOnly) {
  global.botDB.update({ _id: 'raffle' }, { $set: { followers: followersOnly } })

  // update elegibility
  global.botDB.find({ $where: function () { return this._id.startsWith('raffle_participant_') } }, function (err, items) {
    if (err) { log.error(err); return err }
    _.each(items, function (item) {
      if (item.forced === false) { // update non-forced only
        if (!followersOnly && item.eligible === false) { // update only if neccessary
          item.eligible = true
          global.botDB.update({ _id: item._id }, item)
          self.forceSendRaffleParticipants(self)
        } else {
          var user = new User(item.username)
          user.isLoaded().then(function () {
            item.eligible = user.get('isFollower')
            global.botDB.update({ _id: item._id }, item)
            self.forceSendRaffleParticipants(self)
          })
        }
      }
    })
  })
}

module.exports = new RafflesWidget()
