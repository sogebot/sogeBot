'use strict'

// 3rdparty libraries
const _ = require('lodash')
const axios = require('axios')

// bot libraries
const constants = require('../constants')
const config = require('@config')
const System = require('./_interface')

/*
 * !commercial                        - gets an info about alias usage
 * !commercial [duration] [?message]  - run commercial
 */

class Commercial extends System {
  constructor () {
    const settings = {
      commands: [
        { name: '!commercial', permission: constants.OWNER_ONLY, isHelper: true }
      ]
    }

    super({ settings })
  }

  async main (opts) {
    let parsed = opts.parameters.match(/^([\d]+)? ?(.*)?$/)

    if (_.isNil(parsed)) {
      global.commons.sendMessage('$sender, something went wrong with !commercial', opts.sender)
    }

    let commercial = {
      duration: !_.isNil(parsed[1]) ? parseInt(parsed[1], 10) : null,
      message: !_.isNil(parsed[2]) ? parsed[2] : null
    }

    if (_.isNil(commercial.duration)) {
      global.commons.sendMessage('Usage: !commercial [duration] [optional-message]', opts.sender)
      return
    }

    const cid = await global.cache.channelId()
    // check if duration is correct (30, 60, 90, 120, 150, 180)
    if (_.includes([30, 60, 90, 120, 150, 180], commercial.duration)) {
      const url = `https://api.twitch.tv/kraken/channels/${cid}/commercial`
      try {
        await axios({
          method: 'post',
          url,
          data: { length: commercial.duration },
          headers: {
            'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
            'Client-ID': config.settings.client_id,
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Content-Type': 'application/json'
          }
        })

        global.events.fire('commercial', { duration: commercial.duration })
        global.client.commercial(config.settings.broadcaster_username, commercial.duration)
        if (!_.isNil(commercial.message)) global.commons.sendMessage(commercial.message, opts.sender)
      } catch (e) {
        global.log.error(`API: ${url} - ${e.status} ${_.get(e, 'body.message', e.statusText)}`)
        global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'commercial', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.statusText)}` })
      }
    } else {
      global.commons.sendMessage('$sender, available commercial duration are: 30, 60, 90, 120, 150 and 180', opts.sender)
    }
  }
}

module.exports = new Commercial()
