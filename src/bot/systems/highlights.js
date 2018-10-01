'use strict'

// 3rdparty libraries
var _ = require('lodash')
var moment = require('moment')
require('moment-precise-range-plugin')
const cluster = require('cluster')

// bot libraries
const constants = require('../constants')
const System = require('./_interface')

const ERROR_STREAM_NOT_ONLINE = '1'

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
    if (cluster.isWorker) {
      // as we are using API, go through master
      if (process.send) process.send({ type: 'highlight', opts })
    } else {
      const when = await global.cache.when()

      try {
        if (_.isNil(when.online)) throw Error(ERROR_STREAM_NOT_ONLINE)

        const token = await global.oauth.settings.bot.accessToken
        if (token === '') return

        let timestamp = moment.preciseDiff(moment().valueOf(), moment(global.api.streamStartedAt).valueOf(), true)
        let highlight = {
          id: global.api.streamId,
          timestamp: { hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds },
          game: _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a'),
          title: _.get(await global.db.engine.findOne('api.current', { key: 'status' }), 'value', 'n/a')
        }

        this.add(highlight, timestamp, opts.sender)
      } catch (e) {
        switch (e.message) {
          case ERROR_STREAM_NOT_ONLINE:
            global.commons.sendMessage(global.translate('highlights.offline'), opts.sender)
            break
        }
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
