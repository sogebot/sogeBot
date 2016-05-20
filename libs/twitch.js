'use strict'

function Twitch () {
  this.isOnline = false

  var self = this
  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/streams/' + global.configuration.get().twitch.owner,
      json: true
    }, function (err, res, body) {
      if (err) console.log(err)
      if (body.stream) self.isOnline = true
      else self.isOnline = false
    })
  }, 60000)
}

Twitch.prototype.isOnline = function () {
  return this.isOnline
}

module.exports = Twitch
