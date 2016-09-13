'use strict'

var _ = require('lodash')
var log = global.log

function Commons () {
}

Commons.prototype.insertIfNotExists = function (data) {
  var callbacks = this.getCallbacks(data)
  var toInsert = this.stripUnderscores(data)
  var self = this

  global.botDB.insert(toInsert, function (err, newItem) {
    if (err) self.runCallback(callbacks.error, data)
    else self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.updateOrInsert = function (data) {
  var callbacks = this.getCallbacks(data)
  var toFind = this.getObjectToFind(data)
  var toUpdate = this.getObjectToUpdate(data)
  var toInsert = this.stripUnderscores(data)
  var self = this
  global.botDB.update(toFind, {$set: toUpdate}, {}, function (err, numReplaced) {
    if (err) log.error(err)
    if (numReplaced === 0) global.botDB.insert(toInsert)
    self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.remove = function (data) {
  var callbacks = this.getCallbacks(data)
  var toRemove = this.getObjectToFind(data)
  var self = this
  global.botDB.remove(toRemove, {}, function (err, numRemoved) {
    if (err) { log.error(err) }
    numRemoved === 0 ? self.runCallback(callbacks.error, data) : self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.getObjectToFind = function (data) {
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && index.startsWith('_')) {
      Object[index] = data[index]
    }
  }
  return this.stripUnderscores(Object)
}

Commons.prototype.getObjectToUpdate = function (data) {
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && !index.startsWith('_') && !(index === 'success' || index === 'error')) {
      Object[index] = data[index]
    }
  }
  return Object
}

Commons.prototype.stripUnderscores = function (data) {
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && !(index === 'success' || index === 'error')) {
      var i = (index.startsWith('_') ? index.slice(1) : index)
      Object[i] = data[index]
    }
  }
  return Object
}

Commons.prototype.getCallbacks = function (data) {
  var Callbacks = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && (index === 'success' || index === 'error')) {
      Callbacks[index] = data[index]
    }
  }
  return Callbacks
}

Commons.prototype.runCallback = function (cb, data) {
  var value = this.stripUnderscores(data)
  delete value.type
  if (_.isUndefined(cb)) return
  typeof cb === 'function' ? cb(data) : this.sendMessage(global.translate(cb).replace('(value)', value[Object.keys(value)[0]]))
}

Commons.prototype.sendMessage = function (message, sender) {
  if (!_.isUndefined(sender) && sender.username === global.configuration.get().username) return // we don't want to reply on bot commands
  message = !_.isUndefined(sender) ? message.replace('(sender)', '@' + sender.username) : message
  global.client.say(global.configuration.get().twitch.owner, message)
}

Commons.prototype.timeout = function (username, reason, timeout) {
  global.client.timeout(global.configuration.get().twitch.owner, username, timeout, reason)
}

module.exports = Commons
