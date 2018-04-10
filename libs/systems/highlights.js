'use strict'

// 3rdparty libraries
var _ = require('lodash')
var moment = require('moment')
require('moment-precise-range-plugin')
const debug = require('debug')

// bot libraries
const constants = require('../constants')
const config = require('../../config.json')

const ERROR_STREAM_NOT_ONLINE = '1'

/*
 * !highlight <?description> - save highlight with optional description
 * !highlight list           - get list of highlights in current running or latest stream
 */

class Highlights {
  constructor () {
    if (global.commons.isSystemEnabled(this) && require('cluster').isMaster) {
      global.panel.addMenu({category: 'manage', name: 'highlights', id: 'highlights'})
      global.panel.registerSockets({
        self: this,
        expose: ['highlight', 'send'],
        finally: this.send
      })
    }
  }

  commands () {
    return !global.commons.isSystemEnabled('highlights')
      ? []
      : [
        {this: this, command: '!highlight list', fnc: this.list, permission: constants.OWNER_ONLY},
        {this: this, command: '!highlight', fnc: this.highlight, permission: constants.OWNER_ONLY}
      ]
  }

  async highlight (self, sender, description) {
    description = description.trim().length > 0 ? description : null

    const d = debug('systems:highlight:highlight')
    const cid = await global.cache.channelId()
    const when = await global.cache.when()
    const url = `https://api.twitch.tv/kraken/channels/${cid}/videos?broadcast_type=archive&limit=1`

    const needToWait = _.isNil(cid)
    if (needToWait) {
      setTimeout(() => this.highlight(self, sender, description), 1000)
      return
    }

    let highlight = {}

    try {
      if (_.isNil(when.online)) throw Error(ERROR_STREAM_NOT_ONLINE)

      let timestamp = moment.preciseDiff(moment().valueOf(), moment(when.online).valueOf(), true)
      timestamp = { hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds }
      highlight.stream_id = moment(when.online).format('X')
      highlight.stream = when.online
      highlight.timestamp = timestamp
      highlight.description = description
      highlight.title = _.get(await global.db.engine.findOne('api.current', { 'key': 'status' }), 'value', 'n/a')
      highlight.game = _.get(await global.db.engine.findOne('api.current', { 'key': 'status' }), 'value', 'n/a')
      highlight.created_at = _.now()

      d('Created at (cached): %s', _.get(await global.db.engine.findOne('cache', { 'key': 'highlights.created_at' }), 'value', 0))
      d('When online: %s', when.online)

      d('Searching in API')
      // we need to load video id
      let options = {
        url: url,
        headers: {
          Accept: 'application/vnd.twitchtv.v5+json',
          'Client-ID': config.settings.client_id
        }
      }
      global.client.api(options, function (err, res, body) {
        if (err) {
          global.log.error(err, { fnc: 'Highlights#1' })
          global.db.engine.insert('api.stats', { timestamp: _.now(), call: 'highlight', api: 'kraken', endpoint: url, code: err })
          return
        }
        global.db.engine.insert('api.stats', { timestamp: _.now(), call: 'highlight', api: 'kraken', endpoint: url, code: 200 })
        const video = body.videos[0]

        global.db.engine.update('cache', { 'key': 'highlights.id' }, { value: video._id })
        global.db.engine.update('cache', { 'key': 'highlights.created_at' }, { value: when.online })
        highlight.video_id = video._id
        self.add(self, highlight, timestamp, sender)
        global.db.engine.insert('api.stats', { data: body, timestamp: _.now(), call: 'getChannelChattersUnofficialAPI', api: 'unofficial', endpoint: url, code: res.status })
      })
    } catch (e) {
      if (e.message !== ERROR_STREAM_NOT_ONLINE) {
        global.db.engine.insert('api.stats', { timestamp: _.now(), call: 'highlight', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}` })
        global.log.error(e.stack)
      }
      switch (e.message) {
        case ERROR_STREAM_NOT_ONLINE:
          global.commons.sendMessage(global.translate('highlights.offline'), sender)
          break
      }
    }
  }

  async send (self, socket) {
    let highlights = await global.db.engine.find('highlights')
    socket.emit('highlights', _.orderBy(highlights, 'created_at', 'desc'))
  }

  add (self, highlight, timestamp, sender) {
    global.commons.sendMessage(global.translate(_.isNil(highlight.description) ? 'highlights.saved.no-description' : 'highlights.saved.description')
      .replace(/\$description/g, highlight.description)
      .replace(/\$hours/g, (timestamp.hours < 10) ? '0' + timestamp.hours : timestamp.hours)
      .replace(/\$minutes/g, (timestamp.minutes < 10) ? '0' + timestamp.minutes : timestamp.minutes)
      .replace(/\$seconds/g, (timestamp.seconds < 10) ? '0' + timestamp.seconds : timestamp.seconds), sender)

    global.db.engine.insert('highlights', highlight)
  }

  async list (self, sender) {
    let highlights = await global.db.engine.find('highlights')
    const sortedHighlights = _.orderBy(highlights, 'id', 'desc')
    const latestStreamId = sortedHighlights.length > 0 ? sortedHighlights[0].id : null

    if (_.isNull(latestStreamId)) {
      global.commons.sendMessage(global.translate('highlights.list.empty'), sender)
      return
    }
    highlights = _.filter(highlights, function (o) { return o.id === latestStreamId })
    let list = []

    for (let highlight of highlights) {
      list.push(highlight.timestamp.hours + 'h' +
        highlight.timestamp.minutes + 'm' +
        highlight.timestamp.seconds + 's')
    }
    global.commons.sendMessage(global.translate(list.length > 0 ? 'highlights.list.items' : 'highlights.list.empty')
      .replace(/\$items/g, list.join(', ')), sender)
  }
}

module.exports = new Highlights()
