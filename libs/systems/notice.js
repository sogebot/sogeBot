'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var crypto = require('crypto')
var _ = require('lodash')
var log = global.log
var translate = global.translate

function Notice () {
  this.lastNoticeSent = new Date().getTime()
  this.msgCountSent = global.parser.linesParsed

  if (global.configuration.get().systems.notice === true) {
    global.parser.register(this, '!notice add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!notice list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!notice get', this.get, constants.OWNER_ONLY)
    global.parser.register(this, '!notice remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!notice', this.help, constants.OWNER_ONLY)

    global.configuration.register('noticeInterval', translate('notice.settings.noticeInterval'), 'number', 10)
    global.configuration.register('noticeMsgReq', translate('notice.settings.noticeMsgReq'), 'number', 10)

    // start interval for posting notices
    var self = this
    setInterval(function () {
      self.send()
    }, 1000)
  }
  log.info('Notice system ' + translate('core.loaded') + ' ' + (global.configuration.get().systems.notice === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Notice.prototype.send = function () {
  var timeIntervalInMs = global.configuration.getValue('noticeInterval') * 60 * 1000
  var noticeMinChatMsg = global.configuration.getValue('noticeMsgReq')
  var now = new Date().getTime()

  if (now - this.lastNoticeSent >= timeIntervalInMs && global.parser.linesParsed - this.msgCountSent >= noticeMinChatMsg) {
    var self = this
    global.botDB.findOne({$where: function () { return this._id.startsWith('notice') }}).sort({ time: 1 }).exec(function (err, item) {
      if (err) log.error(err)
      if (typeof item !== 'undefined' && item !== null) {
        global.botDB.update({_id: item._id}, {$set: {time: new Date().getTime()}}, {}, function () {
          // reset counters
          self.lastNoticeSent = new Date().getTime()
          self.msgCountSent = global.parser.linesParsed
          global.commons.sendMessage(item.text)
        })
      }
    })
  }
}

Notice.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !notice add <text> | !notice get <id> | !notice remove <id> | !notice list', sender)
}

Notice.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w.+)$/)
    var hash = crypto.createHash('md5').update(parsed[0]).digest('hex').substring(0, 5)
    global.commons.insertIfNotExists({__id: 'notice_' + hash, _text: parsed[0], time: new Date().getTime(), success: global.translate('notice.success.add'), error: global.translate('notice.failed.add')})
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.list = function (self, sender, text) {
  if (_.isNull(text.match(/^(\w+)$/))) {
    global.botDB.find({$where: function () { return this._id.startsWith('notice') }}, function (err, docs) {
      if (err) { log.error(err) }
      var list = []
      docs.forEach(function (e, i, ar) { list.push(e._id.split('_')[1]) })
      var output = (docs.length === 0 ? global.translate('notice.failed.list') : global.translate('notice.success.list') + ': ' + list.join(', '))
      global.commons.sendMessage(output, sender)
    })
  } else {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.get = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.botDB.findOne({_id: 'notice_' + parsed[0]}, function (err, docs) {
      if (err) log.error(err)
      var output = (typeof docs === 'undefined' || docs === null ? global.translate('notice.failed.notFound') : 'Notice#' + parsed[0] + ': ' + docs.text)
      global.commons.sendMessage(output)
    })
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.commons.remove({__id: 'notice_' + parsed[1], success: global.translate('notice.success.remove'), error: global.translate('notice.failed.notFound')})
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

module.exports = new Notice()
