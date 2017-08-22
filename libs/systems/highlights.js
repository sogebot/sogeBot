'use strict'

// 3rdparty libraries
var _ = require('lodash')
var moment = require('moment')
require('moment-precise-range-plugin')
// bot libraries
var constants = require('../constants')
var log = global.log

const ERROR_STREAM_NOT_ONLINE = '1'

/*
 * !highlight <?description> - save highlight with optional description
 * !highlight list           - get list of highlights in current running or latest stream
 */

function Highlights () {
  this.highlights = []
  this.cached = {
    id: null,
    created_at: null
  }

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!highlight list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!highlight', this.highlight, constants.OWNER_ONLY)

    global.panel.addMenu({category: 'manage', name: 'highlights', id: 'highlights'})
    global.panel.socketListening(this, 'highlight.save', this.saveHighlight)
    global.panel.socketListening(this, 'highlight.get', this.sendHighlight)

    global.watcher.watch(this, 'highlights', this._save)
    this._update(this)
  }
}

Highlights.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'highlights' }, function (err, item) {
    if (err) return log.error(err, { fnc: 'Highlights.prototype._update' })
    if (_.isNull(item)) return

    self.highlights = item.highlights
  })
}

Highlights.prototype._save = function (self) {
  var highlights = { highlights: self.highlights }
  global.botDB.update({ _id: 'highlights' }, { $set: highlights }, { upsert: true })
}

Highlights.prototype.highlight = function (self, sender, description) {
  description = description.trim().length > 0 ? description : null

  let highlight = {}

  try {
    if (_.isNil(global.twitch.when.online)) throw Error(ERROR_STREAM_NOT_ONLINE)

    let timestamp = moment.preciseDiff(global.twitch.when.online, moment(), true)
    timestamp = { hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds }
    highlight.stream_id = moment(global.twitch.when.online).format('X')
    highlight.stream = global.twitch.when.online
    highlight.timestamp = timestamp
    highlight.description = description
    highlight.title = global.twitch.current.status
    highlight.game = global.twitch.current.game
    highlight.created_at = moment().format('X')

    if (self.cached.created_at === global.twitch.when.online && !_.isNil(self.cached.id) && !_.isNil(self.cached.created_at)) {
      highlight.video_id = self.cached.id
      self.add(self, highlight, timestamp, sender)
    } else {
      // we need to load video id
      let options = {
        url: 'https://api.twitch.tv/kraken/channels/' + global.channelId + '/videos?broadcast_type=archive&limit=1',
        headers: {
          Accept: 'application/vnd.twitchtv.v5+json',
          'Client-ID': global.configuration.get().twitch.clientId
        }
      }
      global.client.api(options, function (err, res, body) {
        if (err) {
          global.log.error(err, { fnc: 'Highlights#1' })
          return
        }
        const video = body.videos[0]
        self.cached.id = video._id
        highlight.video_id = self.cached.id
        self.add(self, highlight, timestamp, sender)
      })
    }
  } catch (e) {
    switch (e.message) {
      case ERROR_STREAM_NOT_ONLINE:
        global.commons.sendMessage(global.translate('highlights.offline'), sender)
        break
    }
  }
}

Highlights.prototype.saveHighlight = function (self, socket) {
  self.highlight(self, null, '')
}
Highlights.prototype.sendHighlight = function (self, socket) {
  socket.emit('highlight.list', _.orderBy(self.highlights, 'created_at', 'desc'))
}

Highlights.prototype.add = function (self, highlight, timestamp, sender) {
  global.commons.sendMessage(global.translate(_.isNil(highlight.description) ? 'highlights.saved.no-description' : 'highlights.saved.description')
    .replace('$description', highlight.description)
    .replace('$hours', (timestamp.hours < 10) ? '0' + timestamp.hours : timestamp.hours)
    .replace('$minutes', (timestamp.minutes < 10) ? '0' + timestamp.minutes : timestamp.minutes)
    .replace('$seconds', (timestamp.seconds < 10) ? '0' + timestamp.seconds : timestamp.seconds), sender)

  self.highlights.push(highlight)
}

Highlights.prototype.list = function (self, sender) {
  const sortedHighlights = _.orderBy(self.highlights, 'id', 'desc')
  const latestStreamId = sortedHighlights.length > 0 ? sortedHighlights[0].id : null

  if (_.isNull(latestStreamId)) {
    global.commons.sendMessage(global.translate('highlights.list.empty'), sender)
    return
  }
  let highlights = _.filter(self.highlights, function (o) { return o.id === latestStreamId })
  let list = []

  for (let highlight of highlights) {
    list.push(highlight.timestamp.hours + 'h' +
      highlight.timestamp.minutes + 'm' +
      highlight.timestamp.seconds + 's')
  }
  global.commons.sendMessage(global.translate(list.length > 0 ? 'highlights.list.items' : 'highlights.list.empty')
    .replace('$items', list.join(', ')), sender)
}
module.exports = new Highlights()
