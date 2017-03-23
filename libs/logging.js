var winston = require('winston')
var fs = require('fs')
var _ = require('lodash')
var logDir = './logs'

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

global.log = new (winston.Logger)({
  levels: {
    error: 0,
    chatIn: 1,
    chatOut: 2,
    whisperIn: 3,
    whisperOut: 4,
    follow: 6,
    unfollow: 7,
    warning: 8,
    info: 9

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
        if (level === 'error') level = '!!! ERROR !!!'
        if (level === 'chatIn') level = '<<<'
        if (level === 'chatOut') level = '>>>'
        if (level === 'whisperIn') level = '<w<'
        if (level === 'whisperOut') level = '>w>'
        if (level === 'info') level = '|'
        if (level === 'warning') level = '|!'
        if (level === 'follow') level = '+follow'
        if (level === 'unfollow') level = '-follow'
        let username = !_.isUndefined(options.meta.username) ? options.meta.username : ''
        let fnc = !_.isUndefined(options.meta.fnc) ? options.meta.fnc : ''
        return options.timestamp() + (level ? ' ' + level + ' ' : ' ') + (options.message ? options.message : '') + (username ? ' [' + username + ']' : '') + (fnc ? ' [function: ' + fnc + ']' : '')
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
        if (level === 'error') level = '!!! ERROR !!!'
        if (level === 'chatIn') level = '<<<'
        if (level === 'chatOut') level = '>>>'
        if (level === 'whisperIn') level = '<w<'
        if (level === 'whisperOut') level = '>w>'
        if (level === 'info') level = '|'
        if (level === 'warning') level = '|!'
        if (level === 'join') level = 'JOIN:'
        if (level === 'part') level = 'PART:'
        let username = !_.isUndefined(options.meta.username) ? options.meta.username : ''
        return options.timestamp() + (level ? ' ' + level + ' ' : ' ') + (options.message ? options.message : '') + (username ? ' [' + username + ']' : '')
      },
      filename: logDir + '/sogebot.log',
      handleExceptions: false,
      json: false,
      maxsize: 5242880,
      maxFiles: 5,
      colorize: false })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: logDir + '/exceptions.log', json: false })
  ]
})
