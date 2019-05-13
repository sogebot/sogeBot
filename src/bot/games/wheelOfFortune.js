'use strict'

// 3rdparty libraries
const {
  isMainThread
} = require('worker_threads');
const commons = require('../commons')
import { command } from '../decorators';
import Game from './_interface'

class WheelOfFortune extends Game {
  constructor () {
    // define special property name as readonly
    const ui = {
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/wheeloffortune',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/wheeloffortune (500x55)',
          target: '_blank'
        }
      }
    }

    const settings = {
      options: {
        data: JSON.stringify([])
      }
    }
    super({ settings, ui })
  }
  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('win', async (index, username) => {
        let options = JSON.parse(this.settings.options.data)
        // compensate for slight delay
        setTimeout(() => {
          for (let response of options[index].responses) {
            if (response.trim().length > 0) commons.sendMessage(response, { username })
          }
        }, 2000)
      })
    })
  }

  @command('!wof')
  async main (opts) {
    if (isMainThread) {
      const options = JSON.parse(this.settings.options.data)
      global.panel.io.of('/games/wheeloffortune').emit('spin', { options, username: opts.sender.username })
    } else {
      global.workers.sendToMaster({ type: 'call', ns: 'games.wheelOfFortune', fnc: 'main', args: [opts] })
    }
  }
}

module.exports = new WheelOfFortune()
