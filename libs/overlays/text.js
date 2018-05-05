const debug = require('debug')
const _ = require('lodash')
const Message = require('../message')

class TextOverlay {
  constructor () {
    if (require('cluster').isMaster) this.sockets()
  }

  sockets () {
    const d = debug('TextOverlay:sockets')

    global.panel.io.of('/overlays/text').on('connection', (socket) => {
      d('Socket /overlays/text connected, registering sockets')
      const regexp = new RegExp('\\$_[a-zA-Z0-9_]+', 'g')
      socket.on('parse.data', async (b64string, callback) => {
        let html = Buffer.from(b64string, 'base64').toString()
        let match = html.match(regexp)
        if (!_.isNil(match)) {
          for (let variable of html.match(regexp).map((o) => o.replace('$_', ''))) {
            let variableFromDB = await global.db.engine.findOne('customvars', { key: variable })
            let value = _.isEmpty(variableFromDB.value) ? `<strong><i class="fas fa-dollar-sign">_${variable}</i></strong>` : variableFromDB.value
            html = html.replace(new RegExp(`\\$_${variable}`, 'g'), value)
          }
        }
        html = await new Message(html).parse()
        callback(html)
      })
    })
  }
}

module.exports = new TextOverlay()
