'use strict'

// 3rdparty libraries
var _ = require('lodash')

function Watcher () {
  this.variables = {}
  this.objects = {}
  this.functions = {}

  // check for changes
  var self = this
  setInterval(function () { self.checkChanges(self) }, 1000)
}

Watcher.prototype.watch = function (aObj, aVar, aFn) {
  var name = aObj.constructor.name

  this.objects[name] = aObj
  this.variables[name] = _.isUndefined(this.variables[name]) ? {} : this.variables[name]
  this.variables[name][aVar] = aObj[aVar]
  this.functions[name + '.' + aVar] = aFn
}

Watcher.prototype.checkChanges = function (self) {
  _.each(self.variables, function (variables, obj) {
    _.each(variables, function (value, name) {
      if ((typeof value === 'boolean' || typeof value === 'string') && value !== self.objects[obj][name]) {
        self.functions[obj + '.' + name](self.objects[obj])
      } else if (typeof value === 'object' && !self.arraysEqual(value, self.objects[obj][name])) {
        console.log('array changed')
      }

      self.variables[obj][name] = self.objects[obj][name]
    })
  })
}

Watcher.prototype.arraysEqual = function (a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false
  }
  return true
}

module.exports = Watcher
