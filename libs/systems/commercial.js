'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

/*
 * !commercial                        - gets an info about alias usage
 * !commercial [duration] [?message]  - run commercial
 */

function Commercial () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!commercial', this.run, constants.OWNER_ONLY)

    global.parser.registerHelper('!commercial')
  }
}

Commercial.prototype.run = function (self, sender, text) {
  try {
    let parsed = text.match(/^([\d]+)? ?([\u0500-\u052F\u0400-\u04FF\S\s]+)?$/)
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
      global.client.commercial(global.configuration.get().twitch.channel, commercial.duration)
      if (!_.isNil(commercial.message)) global.commons.sendMessage(commercial.message, sender)
    } else {
      global.commons.sendMessage('(sender), available commercial duration are: 30, 60, 90, 120, 150 and 180', sender)
    }
  } catch (e) {
    global.log.error(e, 'Commercial.prototype.run')
    global.commons.sendMessage('something went wrong with !commercial', sender)
  }
}

module.exports = new Commercial()
