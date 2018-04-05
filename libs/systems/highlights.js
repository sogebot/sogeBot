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
    const d = debug('systems:highlight:highlight')
    description = description.trim().length > 0 ? description : null

    let highlight = {}

    try {
      const [when, cid] = await Promise.all([
        global.cache.when(),
        global.cache.channelId()
      ])
      if (_.isNil(when.online)) throw Error(ERROR_STREAM_NOT_ONLINE)

      let timestamp = moment.preciseDiff(when.online, moment(), true)
      timestamp = { hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds }
      highlight.stream_id = moment(when.online).format('X')
      highlight.stream = when.online
      highlight.timestamp = timestamp
      highlight.description = description
      highlight.title = global.twitch.current.status
      highlight.game = global.twitch.current.game
      highlight.created_at = _.now()

      d('Created at (cached): %s', self.cached.created_at)
      d('When online: %s', when.online)

      d('Searching in API')
      // we need to load video id
      const url = `https://api.twitch.tv/kraken/channels/${cid}/videos?broadcast_type=archive&limit=1`
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
        self.cached.id = video._id
        self.cached.created_at = when.online
        highlight.video_id = self.cached.id
        self.add(self, highlight, timestamp, sender)
      })
    } catch (e) {
      d(e)
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
