'use strict'

var constants = require('./constants')
var moment = require('moment')
require('moment-precise-range-plugin')

function Twitch () {
  this.isOnline = false
  this.whenOnline = moment()

  var self = this
  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/streams/' + global.configuration.get().twitch.owner
    }, function (err, res, body) {
      if (err) console.log(err)
      if (body.stream) {
        if (!self.isOnline) self.whenOnline = moment()
        self.isOnline = true
      } else self.isOnline = false
    })
  }, 15000)

  global.parser.register(this, '!uptime', this.uptime, constants.VIEWERS)
}

Twitch.prototype.isOnline = function () {
  return this.isOnline
}

Twitch.prototype.uptime = function (self, sender) {
  var now = moment().preciseDiff(self.whenOnline, true)
  var days = now.days > 0 ? now.days + 'd' : ''
  var hours = now.hours > 0 ? now.hours + 'h' : ''
  var minutes = now.minutes > 0 ? now.minutes + 'm' : ''
  var seconds = now.seconds > 0 ? now.seconds + 's' : ''
  global.commons.sendMessage(self.isOnline ? global.translate('core.online').replace('(time)', days + hours + minutes + seconds) : global.translate('core.offline'))
}

module.exports = Twitch
