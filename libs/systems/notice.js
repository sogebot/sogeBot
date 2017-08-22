'use strict'

// 3rdparty libraries
var crypto = require('crypto')
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

const ERROR_ALREADY_EXISTS = '0'
const ERROR_DOESNT_EXISTS = '1'

/*
 * !notice                - gets an info about notice usage
 * !notice add [response] - add notice with specified response
 * !notice list           - get list of notices
 * !notice get [id]       - get response of defined notice
 * !notice remove [id]    - remove notice by id
 * !notice toggle [id]    - toggle enable/disable of notice
 */

function Notice () {
  this.notices = []

  this.lastNoticeSent = new Date().getTime()
  this.msgCountSent = global.parser.linesParsed

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!notice add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!notice list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!notice get', this.get, constants.OWNER_ONLY)
    global.parser.register(this, '!notice toggle', this.toggle, constants.OWNER_ONLY)
    global.parser.register(this, '!notice remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!notice', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!notice')

    global.configuration.register('noticeInterval', 'notice.settings.noticeInterval', 'number', 10)
    global.configuration.register('noticeMsgReq', 'notice.settings.noticeMsgReq', 'number', 10)

    global.watcher.watch(this, 'notices', this._save)
    this._update(this)

    this.webPanel()

    // start interval for posting notices
    var self = this
    setInterval(function () {
      self.send()
    }, 1000)
  }
}

Notice.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'notices' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'Notice.prototype._update' })
    if (_.isNull(item)) return

    self.notices = item.notices
  })
}

Notice.prototype._save = function (self) {
  var notices = {
    notices: self.notices
  }
  global.botDB.update({ _id: 'notices' }, { $set: notices }, { upsert: true })
}

Notice.prototype.webPanel = function () {
  global.panel.addMenu({category: 'settings', name: 'systems', id: 'systems'})
  global.panel.addMenu({category: 'manage', name: 'notices', id: 'notice'})

  global.panel.socketListening(this, 'getNoticeConfiguration', this.sendConfiguration)
  global.panel.socketListening(this, 'notice.get', this.sendNotices)
  global.panel.socketListening(this, 'notice.delete', this.deleteNotice)
  global.panel.socketListening(this, 'notice.toggle', this.toggleNotice)
  global.panel.socketListening(this, 'notice.create', this.createNotice)
  global.panel.socketListening(this, 'notice.edit', this.editNotice)
}

Notice.prototype.sendNotices = function (self, socket) {
  socket.emit('notice', self.notices)
}

Notice.prototype.deleteNotice = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendNotices(self, socket)
}

Notice.prototype.toggleNotice = function (self, socket, data) {
  self.toggle(self, null, data)
  self.sendNotices(self, socket)
}

Notice.prototype.createNotice = function (self, socket, data) {
  self.add(self, null, data.response)
  self.sendNotices(self, socket)
}

Notice.prototype.editNotice = function (self, socket, data) {
  if (data.value.length === 0) self.remove(self, null, data.id)
  else _.find(self.notices, function (o) { return o.id === data.id }).text = data.value
  self.sendNotices(self, socket)
}

Notice.prototype.sendConfiguration = function (self, socket) {
  socket.emit('noticesConfiguration', {
    interval: global.configuration.getValue('noticeInterval'),
    msgreq: global.configuration.getValue('noticeMsgReq')
  })
}

Notice.prototype.send = async function () {
  var timeIntervalInMs = global.configuration.getValue('noticeInterval') * 60 * 1000
  var noticeMinChatMsg = global.configuration.getValue('noticeMsgReq')
  var now = new Date().getTime()

  if ((now - this.lastNoticeSent >= timeIntervalInMs && global.parser.linesParsed - this.msgCountSent >= noticeMinChatMsg)) {
    let notice = _.orderBy(_.filter(this.notices, function (o) {
      const filter = _.isNil(global.twitch.when.online) ? '(onlineonly)' : '(offlineonly)'
      return o.enabled && !o.text.trim().startsWith(filter)
    }), 'time', 'asc')[0]
    if (_.isUndefined(notice)) return

    this.lastNoticeSent = new Date().getTime()
    this.msgCountSent = global.parser.linesParsed

    global.commons.sendMessage(notice.text, {username: global.configuration.get().twitch.channel})

    // update notice
    notice.time = this.lastNoticeSent
    this.notices = _.filter(this.notices, function (o) {
      return o.id !== notice.id
    })
    this.notices.push(notice)
  }
}

Notice.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !notice add <text> | !notice get <id> | !notice remove <id> | !notice list | !notice toggle <id>', sender)
}

Notice.prototype.add = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)
    let notice = { text: parsed[0], time: new Date().getTime(), id: crypto.createHash('md5').update(parsed[0]).digest('hex').substring(0, 5), enabled: true }
    if (!_.isUndefined(_.find(self.notices, function (o) { return o.id === notice.id }))) throw Error(ERROR_ALREADY_EXISTS)
    self.notices.push(notice)
    global.commons.sendMessage(global.translate('notice.success.add'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_ALREADY_EXISTS:
        global.commons.sendMessage(global.translate('notice.failed.add'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
    }
  }
}

Notice.prototype.list = function (self, sender, text) {
  var notices = []
  _.each(self.notices, function (element) { notices.push(element.id) })
  var output = (notices.length === 0 ? global.translate('notice.failed.list') : global.translate('notice.success.list') + ': ' + notices.join(', '))
  global.commons.sendMessage(output, sender)
}

Notice.prototype.get = function (self, sender, text) {
  try {
    const id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    const notice = _.find(self.notices, function (o) { return o.id === id })
    if (_.isUndefined(notice)) throw Error(ERROR_DOESNT_EXISTS)
    global.commons.sendMessage('Notice#' + notice.id + ': ' + notice.text, sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_DOESNT_EXISTS:
        global.commons.sendMessage(global.translate('notice.failed.notFound'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
    }
  }
}

Notice.prototype.toggle = function (self, sender, text) {
  try {
    const id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    let notice = _.find(self.notices, function (o) { return o.id === id })
    if (_.isUndefined(notice)) {
      global.commons.sendMessage(global.translate('notice.failed.toggle')
        .replace('$notice', id), sender)
      return
    }

    notice.enabled = !notice.enabled
    global.commons.sendMessage(global.translate(notice.enabled ? 'notice.success.enabled' : 'notice.success.disabled')
      .replace('$notice', notice.id), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.remove = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)
    if (_.isUndefined(_.find(self.notices, function (o) { return o.id === parsed[1] }))) throw Error(ERROR_DOESNT_EXISTS)
    self.notices = _.filter(self.notices, function (o) { return o.id !== parsed[1] })
    global.commons.sendMessage(global.translate('notice.success.remove'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_DOESNT_EXISTS:
        global.commons.sendMessage(global.translate('notice.failed.notFound'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
    }
  }
}

module.exports = new Notice()
