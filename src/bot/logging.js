'use strict'

var winston = require('winston')

const format = winston.format

var fs = require('fs')
var _ = require('lodash')
var logDir = './logs'
var moment = require('moment-timezone')
const glob = require('glob')
const {
  isMainThread,
} = require('worker_threads');
const config = require('@config')
const chalk = require('chalk')

config.timezone = config.timezone === 'system' || _.isNil(config.timezone) ? moment.tz.guess() : config.timezone

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir)

const logLevel = !_.isNil(process.env.LOGLEVEL) ? process.env.LOGLEVEL.toLowerCase().trim() : 'info'

const levels = {
  debug: 0,
  error: 1,
  chatIn: 2,
  chatOut: 2,
  whisperIn: 2,
  whisperOut: 2,
  host: 5,
  raid: 5,
  follow: 5,
  unfollow: 5,
  cheer: 5,
  tip: 5,
  sub: 5,
  subgift: 5,
  subcommunitygift: 5,
  resub: 5,
  timeout: 8,
  ban: 8,
  warning: 11,
  info: 12,
  start: 12,
  stop: 12,
  process: 99999
}

if (!isMainThread) {
  global.log = {}
  for (let level of Object.entries(levels)) {
    global.log[level[0]] = function (message, params) {
      global.workers.sendToMaster({ type: 'log', level: level[0], message: message, params: params })
    }
  }
} else {
  global.log = winston.createLogger({
    exitOnError: true,
    json: false,
    levels: levels,
    level: logLevel,
    format: format.combine(
      format.printf(info => {
        let level
        if (info.level === 'error') level = '!!! ERROR !!!'
        if (info.level === 'debug') level = chalk.bgRed.bold('DEBUG:')
        if (info.level === 'chatIn') level = '<<<'
        if (info.level === 'chatOut') level = '>>>'
        if (info.level === 'whisperIn') level = '<w<'
        if (info.level === 'whisperOut') level = '>w>'
        if (info.level === 'info') level = '|'
        if (info.level === 'warning') level = '|!'
        if (info.level === 'timeout') level = '+timeout'
        if (info.level === 'ban') level = '+ban'
        if (info.level === 'follow') level = '+follow'
        if (info.level === 'host') level = '+host'
        if (info.level === 'raid') level = '+raid'
        if (info.level === 'unfollow') level = '-follow'
        if (info.level === 'cheer') level = '+cheer'
        if (info.level === 'tip') level = '+tip'
        if (info.level === 'sub') level = '+sub'
        if (info.level === 'subgift') level = '+subgift'
        if (info.level === 'subcommunitygift') level = '+subcommunitygift'
        if (info.level === 'resub') level = '+resub'
        if (info.level === 'start') level = '== STREAM STARTED =>'
        if (info.level === 'stop') level = '== STREAM STOPPED'

        if (typeof info.message === 'object') info.message = JSON.stringify(info.message, null, 4)
        const timestamp = moment().tz(config.timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSS')

        if (info.level === 'debug') {
          return `${timestamp} ${level} ${chalk.yellow(info.category)} ${info.message} ${info.username ? `[${info.username}]` : ''}`
        } else return `${timestamp} ${level} ${info.message} ${info.username ? `[${info.username}]` : ''}`
      })
    ),
    exceptionHandlers: [
      new winston.transports.File({ filename: logDir + '/exceptions.log', colorize: false, maxsize: 5242880 }),
      new winston.transports.Console()
    ],
    transports: [
      new winston.transports.File({ filename: logDir + '/sogebot.log', colorize: false, maxsize: 5242880, maxFiles: 5, tailable: true }),
      new winston.transports.File({ filename: logDir + '/debug.log', colorize: true, maxsize: 5242880, maxFiles: 5, level: 'debug', tailable: true }),
      new winston.transports.Console()
    ]
  })
}

function Logger () {
  this.files = []
}

Logger.prototype._panel = () => {
  global.panel.addMenu({ category: 'logs', name: 'bot', id: 'logger' })
  global.panel.socketListening(global.logger, 'log.get', global.logger.send)
}

Logger.prototype.send = async function (self, socket, filters) {
  var content = ''

  self.filter = filters
  self.files = glob.sync(logDir + '/sogebot.log')
  for (var i = 0; i < self.files.length; i++) {
    content += await fs.readFileSync(self.files[i], 'utf-8')
  }

  content = self.doFilter(self, content)
  socket.emit('log', content)
}

Logger.prototype.doFilter = function (self, content) {
  // remove startup, debug and errors
  var sContent = content.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}? \| .*/g, '')
    .replace(/.\[39m/g, '', '')
    .split('\n')
  content = []

  for (var i = 0; i < sContent.length; i++) {
    var line = sContent[i]

    var time = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3})/g)
    var curTime = _.now() / 1000

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
       (self.filter.sub && line.match(/\s[+-](sub|resub)\s/g)) ||
       (self.filter.cheer && line.match(/\s[+-]cheer\s/g)) ||
       (self.filter.whispers && line.match(/\s[<>]w[<>]\s/g))) {
      content.push(line)
    }
  }

  return self.filter.order === 'desc' ? _.reverse(content).join('\n') : content.join('\n')
}

module.exports = Logger
