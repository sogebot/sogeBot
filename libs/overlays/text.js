const debug = require('debug')
const _ = require('lodash')

class TextOverlay {
  constructor () {
    this.sockets()
  }

  sockets () {
    const d = debug('TextOverlay:sockets')
    this.io = global.panel.io.of('/overlays/text')

    this.io.on('connection', (socket) => {
      d('Socket /overlays/text connected, registering sockets')
      const regexp = new RegExp('\\$_[a-zA-Z0-9_]+', 'g')
      socket.on('parse.data', async (b64string, callback) => {
        let html = Buffer.from(b64string, 'base64').toString()
        let match = html.match(regexp)
        if (!_.isNil(match)) {
          for (let variable of html.match(regexp).map((o) => o.replace('$_', ''))) {
            variable = await global.db.engine.findOne('customvars', { key: variable })
            let value = _.isEmpty(variable.value) ? '' : variable.value
            html = html.replace(new RegExp(`\\$_${variable.key}`, 'g'), value)
          }
        }
        callback(html)
      })
    })
  }
}

module.exports = new TextOverlay()
