'use strict'

var winston = require('winston')
var fs = require('fs')
var _ = require('lodash')
var logDir = './logs'
var moment = require('moment')
const glob = require('glob')

const datetime = moment().format('YYYY-MM-DDTHH_mm_ss')

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir)

global.log = new (winston.Logger)({
  levels: {
    error: 0,
    chatIn: 1,
    chatOut: 2,
    whisperIn: 3,
    whisperOut: 4,
    host: 5,
    follow: 6,
    unfollow: 7,
    timeout: 8,
    ban: 9,
    warning: 10,
    debug: 11,
    info: 12
  },
  transports: [
    new (winston.transports.Console)({
      handleExceptions: true,
      timestamp: function () {
        return new Date().toISOString()
      },
      formatter: function (options) {
        // Return string will be passed to logger.
        let level = options.level
        options.meta = options.meta || {}
        if (level === 'error') level = '!!! ERROR !!!'
        if (level === 'debug') level = 'DEBUG:'
        if (level === 'chatIn') level = '<<<'
        if (level === 'chatOut') level = '>>>'
        if (level === 'whisperIn') level = '<w<'
        if (level === 'whisperOut') level = '>w>'
        if (level === 'info') level = '|'
        if (level === 'warning') level = '|!'
        if (level === 'timeout') level = '+timeout'
        if (level === 'ban') level = '+ban'
        if (level === 'follow') level = '+follow'
        if (level === 'host') level = '+host'
        if (level === 'unfollow') level = '-follow'
        let username = !_.isUndefined(options.meta.username) ? options.meta.username : ''
        let fnc = !_.isUndefined(options.meta.fnc) ? options.meta.fnc : ''
        return moment().format('YYYY-MM-DDTHH:mm:ss.SSS') + (level ? ' ' + level + ' ' : ' ') + (options.message ? options.message : '') + (username ? ' [' + username + ']' : '') + (fnc ? ' [function: ' + fnc + ']' : '') + (_.size(options.meta) > 0 && level === 'DEBUG:' ? '\n' + options.timestamp() + ' DEBUG: ' + JSON.stringify(options.meta) : '')
      }
    }),
    new winston.transports.File({
      level: 'info',
      timestamp: function () {
        return new Date().toISOString()
      },
      formatter: function (options) {
        // Return string will be passed to logger.
        let level = options.level
        options.meta = options.meta || {}
        if (level === 'error') level = '!!! ERROR !!!'
        if (level === 'debug') level = 'DEBUG:'
        if (level === 'chatIn') level = '<<<'
        if (level === 'chatOut') level = '>>>'
        if (level === 'whisperIn') level = '<w<'
        if (level === 'whisperOut') level = '>w>'
        if (level === 'info') level = '|'
        if (level === 'warning') level = '|!'
        if (level === 'timeout') level = '+timeout'
        if (level === 'ban') level = '+ban'
        if (level === 'follow') level = '+follow'
        if (level === 'host') level = '+host'
        if (level === 'unfollow') level = '-follow'
        let username = !_.isUndefined(options.meta.username) ? options.meta.username : ''
        return moment().format('YYYY-MM-DDTHH:mm:ss.SSS') +
          (level ? ' ' + level + ' ' : ' ') +
          (options.message ? options.message : '') +
          (username ? ' [' + username + ']' : '') +
          (_.size(options.meta) > 0 && level === 'DEBUG:' ? '\n' + moment().format('YYYY-MM-DDTHH:mm:ss.SSS') + ' DEBUG: ' + JSON.stringify(options.meta) : '')
      },
      filename: logDir + '/sogebot-' + datetime + '.log',
      handleExceptions: false,
      json: false,
      maxsize: 5242880,
      maxFiles: 5,
      colorize: false })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      exitOnError: true,
      filename: logDir + '/exceptions-' + moment().format('YYYY-MM-DDTHH_mm_ss') + '.log',
      json: false,
      formatter: function (options) {
        global.log.error('+------------------------------------------------------------------------------+')
        global.log.error('| BOT HAS UNEXPECTEDLY CRASHED                                                 |')
        global.log.error('| PLEASE CHECK https://github.com/sogehige/SogeBot/wiki/How-to-report-an-issue |')
        global.log.error('| AND ADD logs/exceptions.log file to your report                              |')
        global.log.error('+------------------------------------------------------------------------------+')
        return JSON.stringify(options.meta)
      }
    })
  ]
})

function Logger () {
  global.panel.addMenu({category: 'main', name: 'logger', id: 'logger'})

  this.files = []

  global.panel.socketListening(this, 'log.get', this.send)
}

Logger.prototype.send = async function (self, socket, filters) {
  var content = ''

  if (!_.isNull(filters)) {
    self.filter = filters
  } else {
    self.filter = {
      enabled: false,
      follow: false,
      messages: false,
      responses: false,
      whispers: false,
      host: false,
      ban: false,
      timeout: false,
      range: 24
    }
  }

  self.files = glob.sync(logDir + '/sogebot-*.log')
  for (var i = 0; i < self.files.length; i++) {
    content += await fs.readFileSync(self.files[i], 'utf-8')
  }

  content = self.doFilter(self, content)
  socket.emit('log', content)
}

Logger.prototype.doFilter = function (self, content) {
  // remove colors
  var sContent = content.replace(/.\[32m/g, '').replace(/.\[39m/g, '', '').replace(/.*DEBUG:.*/g, '').split('\n')
  content = []

  for (var i = 0; i < sContent.length; i++) {
    var line = sContent[i]

    var time = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3})/g)
    var curTime = moment().format('X')

    if (_.isNull(time)) continue
    time = moment(time[0].replace(/[-:]/g, '')).format('X')

    var range = self.filter.range * 60 * 60
    if (curTime - time > range && parseInt(self.filter.range, 10) !== 0) continue

    if (!self.filter.enabled) {
      content.push(line)
      continue
    }

    if ((self.filter.follow && line.match(/\s[+-]follow\s/g)) ||
       (self.filter.host && line.match(/\s[+-]host\s/g)) ||
       (self.filter.ban && line.match(/\s[+-]ban\s/g)) ||
       (self.filter.timeout && line.match(/\s[+-]timeout\s/g)) ||
       (self.filter.messages && line.match(/\s<{3}\s/g)) ||
       (self.filter.responses && line.match(/\s>{3}\s/g)) ||
       (self.filter.whispers && line.match(/\s[<>]w[<>]\s/g))) {
      content.push(line)
    }
  }

  return content.join('\n')
}

module.exports = Logger
