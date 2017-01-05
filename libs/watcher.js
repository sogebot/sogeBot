'use strict'

// 3rdparty libraries
var _ = require('lodash')

function Watcher () {
  this.variables = {}
  this.objects = {}
  this.functions = {}

  // check for changes
  var self = this
  setInterval(function () { self.checkChanges(self) }, 100)
}

Watcher.prototype.watch = function (aObj, aVar, aFn) {
  var name = aObj.constructor.name

  this.objects[name] = aObj
  this.variables[name] = _.isUndefined(this.variables[name]) ? {} : this.variables[name]
  this.variables[name][aVar] = typeof aObj[aVar] === 'object' ? _.clone(aObj[aVar]) : aObj[aVar]
  this.functions[name + '.' + aVar] = aFn
}

Watcher.prototype.checkChanges = function (self) {
  _.each(self.variables, function (variables, obj) {
    _.each(variables, function (value, name) {
      if ((typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') && value !== self.objects[obj][name]) {
        self.functions[obj + '.' + name](self.objects[obj])
        self.variables[obj][name] = self.objects[obj][name]
      } else if (typeof value === 'object' && (value.length !== self.objects[obj][name].length || !self.arraysEqual(value, self.objects[obj][name]))) {
        self.functions[obj + '.' + name](self.objects[obj])
        self.variables[obj][name] = _.clone(self.objects[obj][name])
      }
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
