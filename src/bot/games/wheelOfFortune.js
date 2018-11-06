'use strict'

// 3rdparty libraries
const cluster = require('cluster')
const Game = require('./_interface')

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
      commands: [
        '!wof'
      ],
      options: {
        data: JSON.stringify([])
      }
    }
    super({ settings, ui })
  }
  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('win', async (index, username) => {
        let options = JSON.parse(await this.settings.options.data)
        // compensate for slight delay
        setTimeout(() => {
          for (let response of options[index].responses) {
            if (response.trim().length > 0) global.commons.sendMessage(response, { username })
          }
        }, 2000)
      })
    })
  }

  async main (opts) {
    if (cluster.isMaster) {
      const options = JSON.parse(await this.settings.options.data)
      global.panel.io.of('/games/wheeloffortune').emit('spin', { options, username: opts.sender.username })
    } else {
      if (process.send) process.send({ type: 'call', ns: 'games.wheelOfFortune', fnc: 'main', args: [opts] })
    }
  }
}

module.exports = new WheelOfFortune()
