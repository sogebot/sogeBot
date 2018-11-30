// @flow
'use strict'

// 3rdparty libraries
const chalk = require('chalk')
const _ = require('lodash')
const HueApi = require('node-hue-api').HueApi
const lightState = require('node-hue-api').lightState
const cluster = require('cluster')

// bot libraries
const constants = require('../constants')
const Integration = require('./_interface')

declare type State = {
  rgb: Array<number>,
  light: number,
  time: number,
  loop: number,
  status: {
    loop: number,
    state: number,
    time: number,
    blocked: boolean
  }
}

/*
 * NOTE: For this integration to be working, you need bot running on same network, as your lights
 *
 * !hue rgb=<0-255>,<0-255>,<0-255> light=<0-x;default:1> loop=<0-x;default:3> time=<100-x;default:500> - start hue alert
 * !hue list                                                                                            - get lights list
 */

class PhillipsHue extends Integration {
  api: any = null
  states: Array<State> = []

  constructor () {
    const settings = {
      commands: [
        { name: '!hue list', fnc: 'getLights', permission: constants.OWNER_ONLY },
        { name: '!hue', fnc: 'hue', permission: constants.OWNER_ONLY }
      ],
      connection: {
        host: '',
        user: '',
        port: '',
        timeout: 30000
      }
    }
    const onChange = {
      enabled: ['onStateChange']
    }

    super({ settings, onChange })

    cluster.on('message', (worker, message) => {
      if (message.type !== 'phillipshue') return
      // $FlowFixMe - An indexer property is missing in PhillipsHue
      if (typeof this[message.fnc] === 'undefined') this[message.fnc](this, message.sender, message.text)
    })

    setInterval(() => {
      if (!this.isEnabled()) return
      for (let index = 0, length = this.states.length; index < length; index++) {
        const state = this.states[index]
        if (_.isNil(state) || state.status.blocked) return true

        if (new Date().getTime() - state.status.time >= state.time) {
          state.status.time = new Date().getTime()

          if (state.status.state === 0) {
            state.status.blocked = true
            state.status.state = 1
            this.api.setLightState(state.light, { 'on': true }).done(function () {
              this.api.setLightState(state.light, lightState.create().rgb(state.rgb)).done(function () {
                state.status.blocked = false
                state.status.loop++
              })
            })
          } else {
            state.status.blocked = true
            state.status.state = 0
            this.api.setLightState(state.light, { 'on': false }).fail(function () { return true }).done(function () {
              state.status.blocked = false
              state.status.loop++
            })
          }
        }

        if (state.status.loop === state.loop * 2) {
          setTimeout(function () {
            this.api.setLightState(state.light, { 'on': false }).fail(function () { return true })
          }, state.time + 100)

          this.states.splice(index, 1) // remove from list
        }
      }
    }, 20)
  }

  onStateChange (key: string, value: string) {
    if (value) {
      if (this.settings.connection.host.length === 0 || this.settings.connection.users.length === 0) return

      this.api = new HueApi(
        this.settings.connection.host,
        this.settings.connection.user,
        this.settings.connection.timeout,
        this.settings.connection.port)

      this.states = []
      global.log.info(chalk.yellow('PHILLIPSHUE: ') + 'Connected to api')
    } else {
      this.api = null
      global.log.info(chalk.yellow('PHILLIPSHUE: ') + 'Not connected to api')
    }
  }

  getLights (opts: CommandOptions) {
    if (cluster.isWorker) {
      if (process.send) process.send({ type: 'phillipshue', fnc: 'getLights', sender: opts.sender, text: opts.parameters })
      return
    }
    this.api.lights()
      .then(function (lights) {
        var output = []
        _.each(lights.lights, function (light) {
          output.push('id: ' + light.id + ', name: \'' + light.name + '\'')
        })
        global.commons.sendMessage(global.translate('phillipsHue.list') + output.join(' | '), opts.sender)
      })
      .fail(function (err) { global.log.error(err, 'PhillipsHue.prototype.getLights#1') })
  }

  hue (opts: CommandOptions) {
    if (cluster.isWorker) {
      if (process.send) process.send({ type: 'phillipshue', fnc: 'hue', sender: opts.sender, text: opts.parameters })
      return
    }
    var rgb = this.parseText(opts.parameters, 'rgb', '255,255,255').split(',').map(o => Number(o))
    if (rgb.length < 3) rgb = [255, 255, 255]

    this.states.push({
      'rgb': rgb,
      'light': Number(this.parseText(opts.parameters, 'light', '1')),
      'time': Number(this.parseText(opts.parameters, 'time', '100')),
      'loop': Number(this.parseText(opts.parameters, 'loop', '3')),
      'status': {
        'loop': 0,
        'state': 0,
        'time': new Date().getTime(),
        'blocked': false
      }
    })
  }

  parseText (text: string, value: string, defaultValue: string) {
    defaultValue = defaultValue || '0'
    for (let part of text.trim().split(' ')) {
      if (part.startsWith(value + '=')) {
        defaultValue = part.replace(value + '=', '')
        break
      }
    }
    return defaultValue
  }
}

module.exports = new PhillipsHue()
