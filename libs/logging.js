var winston = require('winston')
var fs = require('fs')
var logDir = './logs'

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

global.log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new winston.transports.File({
      level: 'info',
      filename: logDir + '/sogebot.log',
      handleExceptions: true,
      json: true,
      maxsize: 5242880,
      maxFiles: 5,
      colorize: false })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: logDir + '/exceptions.log' })
  ]
})
