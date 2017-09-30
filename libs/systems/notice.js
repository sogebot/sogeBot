'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')

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

    this.webPanel()

    // start interval for posting notices
    var self = this
    setInterval(function () {
      self.send()
    }, 100)
  }
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

Notice.prototype.sendNotices = async function (self, socket) {
  socket.emit('notice', await global.db.engine.find('notices'))
}

Notice.prototype.deleteNotice = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendNotices(self, socket)
}

Notice.prototype.toggleNotice = async function (self, socket, data) {
  await self.toggle(self, null, data)
  self.sendNotices(self, socket)
}

Notice.prototype.createNotice = function (self, socket, data) {
  self.add(self, null, data.response)
  self.sendNotices(self, socket)
}

Notice.prototype.editNotice = async function (self, socket, data) {
  if (data.value.length === 0) self.remove(self, null, data.id)
  else await global.db.engine.update('notices', { _id: data.id }, { text: data.value })
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
    this.msgCountSent = global.parser.linesParsed

    let notices = await global.db.engine.find('notices')
    let notice = _.orderBy(_.filter(notices, function (o) {
      const filter = _.isNil(global.twitch.when.online) ? '(onlineonly)' : '(offlineonly)'
      return o.enabled && !o.text.trim().startsWith(filter)
    }), 'time', 'asc')[0]
    if (_.isUndefined(notice)) return

    this.lastNoticeSent = new Date().getTime()

    global.commons.sendMessage(notice.text, {username: global.parser.getOwner()})

    // update notice
    global.db.engine.update('notices', { _id: notice._id }, { time: this.lastNoticeSent })
  }
}

Notice.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !notice add <text> | !notice get <id> | !notice remove <id> | !notice list | !notice toggle <id>', sender)
}

Notice.prototype.add = async function (self, sender, text) {
  try {
    let parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w\S].+)$/)
    let notice = { text: parsed[0], time: new Date().getTime(), enabled: true }

    await global.db.engine.update('notices', { text: notice.text }, notice)
    global.commons.sendMessage(global.translate('notice.success.add'), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.list = async function (self, sender) {
  let notices = await global.db.engine.find('notices')
  var output = (notices.length === 0 ? global.translate('notice.failed.list') : global.translate('notice.success.list') + ': ' + _.map(notices, '_id').join(', '))
  global.commons.sendMessage(output, sender)
}

Notice.prototype.get = async function (self, sender, text) {
  try {
    const id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    const notice = await global.db.engine.findOne('notices', { _id: id })
    if (_.isEmpty(notice)) throw Error(ERROR_DOESNT_EXISTS)
    global.commons.sendMessage('Notice#' + notice._id + ': ' + notice.text, sender)
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

Notice.prototype.toggle = async function (self, sender, text) {
  try {
    const id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    const notice = await global.db.engine.findOne('notices', { _id: id })
    if (_.isEmpty(notice)) {
      global.commons.sendMessage(global.translate('notice.failed.toggle')
        .replace(/\$notice/g, id), sender)
      return
    }

    await global.db.engine.update('notices', { _id: notice._id }, { enabled: !notice.enabled })
    global.commons.sendMessage(global.translate(!notice.enabled ? 'notice.success.enabled' : 'notice.success.disabled')
      .replace(/\$notice/g, notice._id), sender)
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.remove = async function (self, sender, text) {
  try {
    let id = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    let removed = await global.db.engine.remove('notices', { _id: id })
    if (!removed) throw Error(ERROR_DOESNT_EXISTS)
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
