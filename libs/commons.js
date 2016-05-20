'use strict'

function Commons () {
}

Commons.prototype.insertIfNotExists = function (data) {
  var messages = this.getMessages(data)
  var toFind = this.getObjectToFind(data)
  var toInsert = this.stripUnderscores(data)
  global.botDB.find(toFind, function (err, docs) {
    if (err) { console.log(err) }
    if (docs.length === 0) { // it is safe to insert new notice?
      global.botDB.insert(toInsert, function (err, newItem) {
        if (err) { console.log(err) }
        global.client.action(global.configuration.get().twitch.owner, messages.successText)
      })
    } else {
      global.client.action(global.configuration.get().twitch.owner, messages.errorText)
    }
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

Commons.prototype.stripUnderscores = function (data) {
  var Object = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && index.indexOf('Text', index.length - 'Text'.length) === -1) {
      var i = (index.startsWith('_') ? index.slice(1) : index)
      Object[i] = data[index]
    }
  }
  return Object
}

Commons.prototype.getMessages = function (data) {
  var Messages = {}
  for (var index in data) {
    if (data.hasOwnProperty(index) && index.indexOf('Text', index.length - 'Text'.length) !== -1) {
      Messages[index] = data[index]
    }
  }
  return Messages
}

module.exports = Commons
