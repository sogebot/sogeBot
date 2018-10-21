'use strict'
var fs = require('fs')
var path = require('path')
var _ = require('lodash')

var dist = {
  'js': {
    'commons': 'commons.js',
    'components': 'components.js'
  }
}

var modules = {
  'gridstack': {
    'js': 'dist/gridstack.all.js',
    'css': 'dist/gridstack.min.css'
  },
  'page': {
    'js': 'page.js'
  },
  'chart.js': {
    'js': 'dist/Chart.min.js'
  },
  'flv.js': {
    'js': 'dist/flv.min.js'
  },
  'bootstrap': {
    'js': 'dist/js/bootstrap.min.js'
  },
  'jquery': {
    'js': 'dist/jquery.min.js'
  },
  'sortablejs': {
    'js': 'Sortable.min.js'
  },
  'popper.js': {
    'js': 'dist/umd/popper.min.js'
  },
  'lodash': {
    'js': 'lodash.min.js'
  },
  'bootstrap-toggle': {
    'js': 'js/bootstrap-toggle.min.js',
    'css': 'css/bootstrap-toggle.min.css'
  },
  'bootstrap-menu': {
    'js': 'dist/BootstrapMenu.min.js'
  },
  'bootstrap-slider': {
    'js': 'dist/bootstrap-slider.min.js',
    'css': 'dist/css/bootstrap-slider.min.css'
  },
  'velocity-animate': {
    'js': [
      'velocity.min.js',
      'velocity.ui.min.js'
    ]
  }
}

fs.mkdirRecursive = function (dirPath) {
  var directories = dirPath.split('/')
  _.each(directories, function (directory, index) {
    var dirsToAppend = []
    for (var i = 0; i < index; i++) {
      dirsToAppend.push(directories[i])
    }
    if (!fs.existsSync(path.join(dirsToAppend.join('/'), directory))) fs.mkdirSync(path.join(dirsToAppend.join('/'), directory))
  })
}

_.each(modules, function (aList, aName) {
  _.each(aList, function (aFiles, aType) {
    if (typeof aFiles === 'string') aFiles = [aFiles]
    aFiles.map(function (x, i, ar) { ar[i] = ['node_modules', aName, ar[i]].join('/') })
    _.each(aFiles, function (aFile) {
      fs.mkdirRecursive(['public', 'dist', aName, aType].join('/'))
      fs.createReadStream(aFile)
        .pipe(fs.createWriteStream([['public', 'dist', aName, aType].join('/'), aFile.split('/')[aFile.split('/').length - 1]].join('/')))
    })
  })
})

_.each(dist, function (aList, aName) {
  _.each(aList, function (aFiles, aType) {
    if (typeof aFiles === 'string') aFiles = [aFiles]
    aFiles.map(function (x, i, ar) { ar[i] = ['dist', aName, ar[i]].join('/') })
    _.each(aFiles, function (aFile) {
      fs.mkdirRecursive(['public', 'dist', aName, aType].join('/'))
      fs.createReadStream(aFile)
        .pipe(fs.createWriteStream([['public', 'dist', aName, aType].join('/'), aFile.split('/')[aFile.split('/').length - 1]].join('/')))
    })
  })
})
