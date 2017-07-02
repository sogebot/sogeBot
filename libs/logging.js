var winston = require('winston')
var fs = require('fs')
var _ = require('lodash')
var logDir = './logs'
var moment = require('moment')

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
        return options.timestamp() +
          (level ? ' ' + level + ' ' : ' ') +
          (options.message ? options.message : '') +
          (username ? ' [' + username + ']' : '') +
          (_.size(options.meta) > 0 && level === 'DEBUG:' ? '\n' + options.timestamp() + ' DEBUG: ' + JSON.stringify(options.meta) : '')
      },
      filename: logDir + '/sogebot-' + moment().format('YYYY-MM-DDTHH_mm_ss') + '.log',
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
