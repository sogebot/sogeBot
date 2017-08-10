'use strict'

// 3rdparty libraries
const _ = require('lodash')
const HueApi = require('node-hue-api').HueApi
const lightState = require('node-hue-api').lightState

// bot libraries
const constants = require('../constants')

/*
 * !hue <state-id> - start hue on state-id - this MUST be set in webpanel
 */

function PhillipsHue () {
  this.commands = []

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!hue', this.hue, constants.OWNER_ONLY)

    var host = '127.0.0.1'
    var user = 'newdeveloper'
    var timeout = 10000
    var port = 8000

    var api = new HueApi(host, user, timeout, port)

    var states = {
      'some_id': {
        'light': 2,
        'states': [
          lightState.create().rgb(0, 0, 255).on(),
          lightState.create().off()
        ],
        'time': 1000,
        'loop': 2,
        'status': {
          'loop': 0,
          'running': true,
          'time': new Date().getTime(),
          'state': 0
        }
      }
    }

    setInterval(function () {
      var running = _.filter(states, function (state) { return state.status.running })
      _.each(running, function (state) {
        if (new Date().getTime() - state.status.time >= state.time) {
          state.status.time = new Date().getTime()

          state.status.loop++
          state.status.state++

          // run through states
          if (_.isNil(state.states[state.status.state])) state.status.state = 0
          api.setLightState(state.light, state.states[state.status.state]).fail(function () { return true })
        }

        if (state.status.loop === state.loop * state.states.length) {
          state.status.running = false
          state.status.loop = 0
          setTimeout(function () {
            api.setLightState(state.light, lightState.create().off())
          }, state.time + 100)
        }
      })
    }, 100)

    // api.lights().then(this.displayBridges) GET LIGHTS list
  }
}

PhillipsHue.prototype.displayBridges = function (bridge) {
  console.log(JSON.stringify(bridge))
}

module.exports = new PhillipsHue()
