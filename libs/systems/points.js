'use strict'
var chalk = require('chalk')
var Database = require('nedb')
var constants = require('../constants')

var database = new Database({
  filename: 'db/points.db',
  autoload: true
})
database.persistence.setAutocompactionInterval(60000)

function Points () {
  if (global.configuration.get().systems.points === true) {
    global.parser.register(this, '!points add', this.addPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points remove', this.removePoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points all', this.allPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points set', this.setPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points get', this.getPointsFromUser, constants.OWNER_ONLY)
    global.parser.register(this, '!points give', this.givePoints, constants.VIEWERS)
    global.parser.register(this, '!makeitrain', this.rainPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points', this.getPoints, constants.VIEWERS)

    // add events for join/part
    var self = this
    setTimeout(function () {
      self.addEvents(self)
    }, 1000)
    // count Points - every 30s check points
    setInterval(function () {
      self.updatePoints()
    }, 30000)

    // disable counting for all users on start
    database.update({ }, {$set: {isOnline: false, partedTime: new Date().getTime()}}, { multi: true })
  }

  console.log('Points system loaded and ' + (global.configuration.get().systems.points === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Points.prototype.getDatabase = function () {
  return database
}

Points.prototype.addEvents = function (self) {
  global.client.on('join', function (channel, username) {
    if (username !== global.configuration.get().twitch.username) {
      self.startCounting(username)
    }
  })
  global.client.on('part', function (channel, username) {
    if (username !== global.configuration.get().twitch.username) {
      self.stopCounting(username)
    }
  })
}

Points.prototype.setPoints = function (self, sender, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify user')
    return
  }

  // check if response after keyword is set
  if (text.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify points')
    return
  }

  var user = text.split(' ')[0]
  var points = parseInt(text.replace(user, '').trim(), 10)

  if (!Number.isInteger(points)) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: Cannot set NaN points.')
    return
  }

  database.findOne({ username: user }, function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) {
      database.insert({username: user, points: points})
    } else {
      database.update({username: user}, {$set: {points: points}}, {})
    }
    global.client.action(global.configuration.get().twitch.owner, 'I just set ' + points + ' Points to ' + user)
  })
}

Points.prototype.givePoints = function (self, user, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify user')
    return
  }

  // check if response after keyword is set
  if (text.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify points')
    return
  }

  var user2 = text.split(' ')[0]
  var points = parseInt(text.replace(user2, '').trim(), 10)

  if (!Number.isInteger(points)) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: Cannot set NaN points.')
    return
  }

  database.findOne({ username: user.username }, function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) {
      global.client.action(global.configuration.get().twitch.owner, 'You, ' + user.username + ', cannot give points as you have none.')
    } else {
      if (parseInt(item.points, 10) < points) {
        global.client.action(global.configuration.get().twitch.owner, 'You, ' + user.username + ", don't have enough points.")
      }
      database.findOne({ username: user2 }, function (err, item) {
        if (err) console.log(err)
        if (typeof item === 'undefined' || item === null) {
          database.insert({username: user2, points: points})
        } else {
          database.update({username: user2}, {$set: {points: parseInt(item.points, 10) + points}}, {})
        }
      })
      database.update({username: user.username}, {$set: {points: parseInt(item.points, 10) - points}}, {})
      global.client.action(global.configuration.get().twitch.owner, user.username + ' just gave ' + points + ' Points to ' + user2)
    }
  })
}

Points.prototype.getPointsFromUser = function (self, sender, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify user')
    return
  }

  var user = text.trim()

  database.findOne({ username: user }, function (err, item) {
    if (err) console.log(err)
    // TODO - create a function as this is used a lot
    var points = (typeof item !== 'undefined' && item !== null ? item.points : 0)
    var responsePattern = global.configuration.get().systems.pointsResponse
    var pointsNames = global.configuration.get().systems.pointsName.split('|')

    var single, multi, xmulti
    // get single|x:multi|multi from pointsName
    switch (pointsNames.length) {
      case 0:
        xmulti = null
        single = 'Point'
        multi = 'Points'
        break
      case 1:
        xmulti = null
        single = multi = pointsNames[0]
        break
      case 2:
        single = pointsNames[0]
        multi = pointsNames[1]
        xmulti = null
        break
      default:
        var len = pointsNames.length
        single = pointsNames[0]
        multi = pointsNames[len - 1]
        xmulti = {}

        for (var pattern in pointsNames) {
          if (pointsNames.hasOwnProperty(pattern) && pattern !== 0 && pattern !== len - 1) {
            var maxPts = pointsNames[pattern].split(':')[0]
            var name = pointsNames[pattern].split(':')[1]
            xmulti[maxPts] = name
          }
        }
        break
    }

    var pointsName = (points === 1 ? single : multi)
    if (typeof xmulti === 'object' && points > 1 && points <= 10) {
      for (var i = points; i <= 10; i++) {
        if (typeof xmulti[i] === 'string') {
          pointsName = xmulti[i]
          break
        }
      }
    }

    global.client.action(global.configuration.get().twitch.owner,
      responsePattern.replace('(sender)', user).replace('(amount)', points + ' ' + pointsName))
  })
}

Points.prototype.allPoints = function (self, user, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify points')
    return
  }

  var points = parseInt(text.trim(), 10)

  if (!Number.isInteger(points)) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: Cannot add NaN points.')
    return
  }

  database.find({ isOnline: true }, function (err, items) {
    if (err) console.log(err)
    items.forEach(function (e, i, ar) {
      database.update({username: e.username}, {$set: {points: parseInt(e.points, 10) + points}}, {})
    })
    global.client.action(global.configuration.get().twitch.owner, 'I just added ' + points + ' Points to all users')
  })
}

Points.prototype.rainPoints = function (self, user, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify max points')
    return
  }

  var points = parseInt(text.trim(), 10)

  if (!Number.isInteger(points)) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: Cannot add NaN points.')
    return
  }

  database.find({ isOnline: true }, function (err, items) {
    if (err) console.log(err)
    items.forEach(function (e, i, ar) {
      var random = Math.floor(Math.random() * points)
      database.update({username: e.username}, {$set: {points: parseInt(e.points, 10) + random}}, {})
    })
    global.client.action(global.configuration.get().twitch.owner, 'I just added 0-' + points + ' Points to all users')
  })
}

Points.prototype.addPoints = function (self, sender, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify user')
    return
  }

  // check if response after keyword is set
  if (text.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify points')
    return
  }

  var user = text.split(' ')[0]
  var points = parseInt(text.replace(user, '').trim(), 10)

  if (!Number.isInteger(points)) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: Cannot add NaN points.')
    return
  }

  database.findOne({ username: user }, function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) {
      database.insert({username: user, points: points})
    } else {
      database.update({username: user}, {$set: {points: parseInt(item.points, 10) + points}}, {})
    }
    global.client.action(global.configuration.get().twitch.owner, 'I just added ' + points + ' Points to ' + user)
  })
}

Points.prototype.removePoints = function (self, sender, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify user')
    return
  }

  // check if response after keyword is set
  if (text.split(' ').length <= 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: You need to specify points')
    return
  }

  var user = text.split(' ')[0]
  var points = parseInt(text.replace(user, '').trim(), 10)

  if (!Number.isInteger(points)) {
    global.client.action(global.configuration.get().twitch.owner, 'Points error: Cannot remove NaN points.')
    return
  }

  database.findOne({ username: user }, function (err, item) {
    if (err) console.log(err)
    if (typeof item === 'undefined' || item === null) {
      database.insert({username: user, points: points})
    } else {
      if (parseInt(item.points, 10) - points < 0) { points = item.points }
      database.update({username: user}, {$set: {points: parseInt(item.points, 10) - points}}, {})
    }
    global.client.action(global.configuration.get().twitch.owner, 'I just removed ' + points + ' Points from ' + user)
  })
}

Points.prototype.getPoints = function (self, user) {
  database.findOne({ username: user.username }, function (err, item) {
    if (err) console.log(err)
    var points = (typeof item !== 'undefined' && item !== null ? item.points : 0)
    var responsePattern = global.configuration.get().systems.pointsResponse
    var pointsNames = global.configuration.get().systems.pointsName.split('|')

    var single, multi, xmulti
    // get single|x:multi|multi from pointsName
    switch (pointsNames.length) {
      case 0:
        xmulti = null
        single = 'Point'
        multi = 'Points'
        break
      case 1:
        xmulti = null
        single = multi = pointsNames[0]
        break
      case 2:
        single = pointsNames[0]
        multi = pointsNames[1]
        xmulti = null
        break
      default:
        var len = pointsNames.length
        single = pointsNames[0]
        multi = pointsNames[len - 1]
        xmulti = {}

        for (var pattern in pointsNames) {
          if (pointsNames.hasOwnProperty(pattern) && pattern !== 0 && pattern !== len - 1) {
            var maxPts = pointsNames[pattern].split(':')[0]
            var name = pointsNames[pattern].split(':')[1]
            xmulti[maxPts] = name
          }
        }
        break
    }

    var pointsName = (points === 1 ? single : multi)
    if (typeof xmulti === 'object' && points > 1 && points <= 10) {
      for (var i = points; i <= 10; i++) {
        if (typeof xmulti[i] === 'string') {
          pointsName = xmulti[i]
          break
        }
      }
    }

    global.client.action(global.configuration.get().twitch.owner,
      responsePattern.replace('(sender)', user.username).replace('(amount)', points + ' ' + pointsName))
  })
}

Points.prototype.startCounting = function (username) {
  database.findOne({ username: username }, function (err, item) {
    if (err) console.log(err)
    if (typeof item !== 'undefined' && item !== null) { // exists, update
      var partedTime = (item.partedTime === 0 ? item.pointsGrantedAt : item.partedTime) // if not correctly parted
      var pointsGrantedAt = new Date().getTime() + (item.pointsGrantedAt - partedTime)
      database.update({_id: item._id}, {$set: {isOnline: true, pointsGrantedAt: pointsGrantedAt}}, {})
    } else { // not exists, create a new one
      database.insert({username: username, isOnline: true, pointsGrantedAt: new Date().getTime(), partedTime: 0, points: 0})
    }
  })
}

Points.prototype.stopCounting = function (username) {
  database.update({ username: username }, {$set: {isOnline: false, partedTime: new Date().getTime()}}, {})
}

Points.prototype.updatePoints = function () {
  var interval = global.configuration.get().systems.pointsInterval * 60 * 1000
  var ptsPerInterval = global.configuration.get().systems.pointsPerInterval
  database.find({ isOnline: true }, function (err, items) {
    if (err) console.log(err)
    items.forEach(function (e, i, ar) {
      var points = parseInt(e.points, 10) + parseInt(ptsPerInterval, 10)
      var now = new Date().getTime()
      if (now - e.pointsGrantedAt >= interval) {
        database.update({_id: e._id}, {$set: {pointsGrantedAt: now, points: points}}, {})
      }
    })
  })
}

module.exports = new Points()
