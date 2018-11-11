'use strict'

// 3rdparty libraries
var _ = require('lodash')
var moment = require('moment')
require('moment-precise-range-plugin')
const cluster = require('cluster')
const axios = require('axios')

// bot libraries
const constants = require('../constants')
const System = require('./_interface')

const ERROR_STREAM_NOT_ONLINE = '1'
const ERROR_MISSING_TOKEN = '2'

/*
 * !highlight <?description> - save highlight with optional description
 * !highlight list           - get list of highlights in current running or latest stream
 */

class Highlights extends System {
  constructor () {
    const settings = {
      commands: [
        { name: '!highlight list', permission: constants.OWNER_ONLY },
        { name: '!highlight', permission: constants.OWNER_ONLY }
      ]
    }
    super({ settings })

    if (cluster.isMaster) {
      global.panel.addMenu({ category: 'manage', name: 'highlights', id: 'highlights/list' })

      cluster.on('message', (worker, message) => {
        if (message.type !== 'highlight') return
        this.main(message.opts)
      })
    }
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('highlight', () => {
        this.main({ parameters: '', sender: null })
      })
      socket.on('list', async (cb) => {
        cb(null, await global.db.engine.find(this.collection.data))
      })
      socket.on('delete', async (_id, cb) => {
        await global.db.engine.remove(this.collection.data, { _id })
        cb(null)
      })
    })
  }

  async main (opts) {
    const when = await global.cache.when()
    const token = global.oauth.settings.bot.accessToken
    const cid = global.oauth.channelId
    const url = `https://api.twitch.tv/helix/videos?user_id=${cid}&type=archive&first=1`

    try {
      if (_.isNil(when.online)) throw Error(ERROR_STREAM_NOT_ONLINE)
      if (token === '' || cid === '') throw Error(ERROR_MISSING_TOKEN)

      // we need to load video id
      const request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      // save remaining api calls
      global.api.remainingAPICalls = request.headers['ratelimit-remaining']
      global.api.refreshAPICalls = request.headers['ratelimit-reset']

      let timestamp = moment.preciseDiff(moment().valueOf(), moment(global.api.streamStartedAt).valueOf(), true)
      let highlight = {
        id: request.data.data[0].id,
        timestamp: { hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds },
        game: _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a'),
        title: _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a'),
        created_at: Date.now()
      }

      global.panel.io.emit('api.stats', { data: request.data, timestamp: _.now(), call: 'highlights', api: 'helix', endpoint: url, code: request.status, remaining: global.api.remainingAPICalls })

      this.add(highlight, timestamp, opts.sender)
    } catch (e) {
      global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'highlights', api: 'helix', endpoint: url, code: e.stack, remaining: global.api.remainingAPICalls })
      switch (e.message) {
        case ERROR_STREAM_NOT_ONLINE:
          global.log.error('Cannot highlight - stream offline')
          global.commons.sendMessage(global.translate('highlights.offline'), opts.sender)
          break
        case ERROR_MISSING_TOKEN:
          global.log.error('Cannot highlight - missing token')
          break
        default:
          global.log.error(e.stack)
      }
    }
  }

  async add (highlight, timestamp, sender) {
    global.api.createMarker()
    global.commons.sendMessage(global.translate('highlights.saved')
      .replace(/\$hours/g, (timestamp.hours < 10) ? '0' + timestamp.hours : timestamp.hours)
      .replace(/\$minutes/g, (timestamp.minutes < 10) ? '0' + timestamp.minutes : timestamp.minutes)
      .replace(/\$seconds/g, (timestamp.seconds < 10) ? '0' + timestamp.seconds : timestamp.seconds), sender)

    global.db.engine.insert(this.collection.data, highlight)
  }

  async list (opts) {
    let highlights = await global.db.engine.find(this.collection.data)
    const sortedHighlights = _.orderBy(highlights, 'id', 'desc')
    const latestStreamId = sortedHighlights.length > 0 ? sortedHighlights[0].id : null

    if (_.isNull(latestStreamId)) {
      global.commons.sendMessage(global.translate('highlights.list.empty'), opts.sender)
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
      .replace(/\$items/g, list.join(', ')), opts.sender)
  }
}

module.exports = new Highlights()
