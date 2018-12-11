'use strict'

// 3rdparty libraries
const _ = require('lodash')
const cluster = require('cluster')

// bot libraries
var constants = require('../constants')
var Points = require('./points')
const Expects = require('../expects.js')
const System = require('./_interface')

const ERROR_NOT_ENOUGH_OPTIONS = 'Expected more parameters'
const ERROR_ALREADY_OPENED = '1'
const ERROR_NOT_RUNNING = '3'
const ERROR_UNDEFINED_BET = '4'
const ERROR_NOT_OPTION = '7'

/*
 * !vote
 * !vote [x]
 * !vote open [-tips/-bits/-points] -title "your vote title" option | option | option
 * !vote close
 */

class Voting extends System {
  constructor () {
    const options = {
      settings: {
        commands: [
          { name: '!vote', isHelper: true },
          { name: '!vote open', permission: constants.MODS },
          { name: '!vote close', permission: constants.MODS }
        ]
      },
      on: {
        tip: (tip) => this.parseTip(tip.message),
        bit: (bit) => this.parseBit(bit.message)
      }
    }

    super(options)
  }

  async open (opts) {
    const cVote = await global.db.engine.findOne(this.collection.data, { isOpened: true })

    try {
      if (!_.isEmpty(cVote)) { throw new Error(ERROR_ALREADY_OPENED) }

      let [type, title, options] = new Expects(opts.parameters)
        .switch({ name: 'type', values: ['tips', 'bits'], optional: true, default: '' })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray()
      if (options.length < 2) throw new Error(ERROR_NOT_ENOUGH_OPTIONS)

      let voting = { type, title, isOpened: true, options: [] }
      for (let i in options) voting.options[i] = { name: options[i] }

      await global.db.engine.insert(this.collection.data, voting)

      const translations = 'systems.voting.opened' + (type.length > 0 ? `_${type}` : '')
      global.commons.sendMessage(global.commons.prepare(translations, {
        title: title,
        command: this.settings.commands['!vote']
      }), opts.sender)
      for (let index in options) {
        setTimeout(() => {
          if (type === '') global.commons.sendMessage(this.settings.commands['!vote'] + ` ${index} => ${options[index]}`, opts.sender)
          else global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${options[index]}`, opts.sender)
        }, 100 * (Number(index) + 1))
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('voting.notEnoughOptions'), opts.sender)
          break
        case ERROR_ALREADY_OPENED:
          const translations = 'systems.voting.opened' + (cVote.type.length > 0 ? `_${cVote.type}` : '')
          global.commons.sendMessage(global.commons.prepare(translations, {
            title: cVote.title,
            command: this.settings.commands['!vote']
          }), opts.sender)
          for (let index in cVote.options) {
            setTimeout(() => {
              if (cVote.type === '') global.commons.sendMessage(this.settings.commands['!vote'] + ` ${index} => ${cVote.options[index].name}`, opts.sender)
              else global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${cVote.options[index].name}`, opts.sender)
            }, 100 * (Number(index) + 1))
          }
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
    }
  }

  main () {
    // help or vote on normal
  }
}

module.exports = new Voting()
