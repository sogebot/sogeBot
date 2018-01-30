'use strict'

// 3rdparty libraries
const _ = require('lodash')
const snekfetch = require('snekfetch')

// bot libraries
const constants = require('../constants')
const config = require('../../config')

/*
 * !commercial                        - gets an info about alias usage
 * !commercial [duration] [?message]  - run commercial
 */

class Commercial {
  constructor () {
    if (global.commons.isSystemEnabled(this)) {
      global.parser.register(this, '!commercial', this.run, constants.OWNER_ONLY)

      global.parser.registerHelper('!commercial')
    }
  }

  async run (self, sender, text) {
    let parsed = text.match(/^([\d]+)? ?(.*)?$/)

    if (_.isNil(parsed)) {
      global.commons.sendMessage('$sender, something went wrong with !commercial', sender)
    }

    let commercial = {
      duration: !_.isNil(parsed[1]) ? parseInt(parsed[1], 10) : null,
      message: !_.isNil(parsed[2]) ? parsed[2] : null
    }

    if (_.isNil(commercial.duration)) {
      global.commons.sendMessage('Usage: !commercial [duration] [optional-message]', sender)
      return
    }

    // check if duration is correct (30, 60, 90, 120, 150, 180)
    if (_.includes([30, 60, 90, 120, 150, 180], commercial.duration)) {
      const url = `https://api.twitch.tv/kraken/channels/${global.channelId}/commercial`
      try {
        await snekfetch.post(url, { data: { length: commercial.duration } })
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/vnd.twitchtv.v5+json')
          .set('Client-ID', config.settings.client_id)
          .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])

        global.events.fire('commercial', { duration: commercial.duration })
        global.client.commercial(config.settings.broadcaster_username, commercial.duration)
        if (!_.isNil(commercial.message)) global.commons.sendMessage(commercial.message, sender)
      } catch (e) {
        global.log.error(`API: ${url} - ${e.status} ${e.body.message}`)
        global.db.engine.insert('APIStats', { timestamp: _.now(), call: 'commercial', api: 'kraken', endpoint: url, code: `${e.status} ${e.body.message}` })
      }
    } else {
      global.commons.sendMessage('$sender, available commercial duration are: 30, 60, 90, 120, 150 and 180', sender)
    }
  }
}

module.exports = new Commercial()
