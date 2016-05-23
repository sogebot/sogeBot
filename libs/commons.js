'use strict'

function Commons () {
}

Commons.prototype.insertIfNotExists = function (data) {
  var callbacks = this.getCallbacks(data)
  var toFind = this.getObjectToFind(data)
  var toInsert = this.stripUnderscores(data)
  var self = this
  global.botDB.find(toFind, function (err, docs) {
    if (err) { console.log(err) }
    if (docs.length === 0) { // it is safe to insert new notice?
      global.botDB.insert(toInsert, function (err, newItem) {
        if (err) { console.log(err) }
        self.runCallback(callbacks.success, data)
      })
    } else {
      self.runCallback(callbacks.error, data)
    }
  })
}

Commons.prototype.updateOrInsert = function (data) {
  var callbacks = this.getCallbacks(data)
  var toFind = this.getObjectToFind(data)
  var toUpdate = this.getObjectToUpdate(data)
  var toInsert = this.stripUnderscores(data)
  var self = this
  global.botDB.update(toFind, {$set: toUpdate}, {}, function (err, numReplaced) {
    if (err) console.log(err)
    if (numReplaced === 0) global.botDB.insert(toInsert)
    self.runCallback(callbacks.success, data)
  })
}

Commons.prototype.remove = function (data) {
  var callbacks = this.getCallbacks(data)
  var toRemove = this.getObjectToFind(data)
  var self = this
  global.botDB.remove(toRemove, {}, function (err, numRemoved) {
    if (err) { console.log(err) }
    (numRemoved === 0 ? self.runCallback(callbacks.error, data) : self.runCallback(callbacks.success, data))
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
  (typeof cb === 'function' ? cb(data) : this.sendMessage(cb))
}

Commons.prototype.sendMessage = function (message) {
  global.client.action(global.configuration.get().twitch.owner, message)
}

module.exports = Commons
