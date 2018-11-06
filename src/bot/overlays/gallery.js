// @flow
'use strict'

const Overlay = require('./_interface')

class Gallery extends Overlay {
  constructor () {
    const ui = {
      _hidden: true
    }
    super({ ui })
    this.addMenu({ category: 'registry', name: 'gallery', id: 'registry.gallery/list' })
  }

  sockets () {
    global.panel.io.of('/overlays/gallery').on('connection', (socket) => {
      socket.on('upload', async (data, cb) => {
        var matches = data.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/)
        if (matches.length !== 3) { return false }
        const type = matches[1]
        const item = await global.db.engine.insert(this.collection.data, { type, data })
        cb({ type, _id: String(item._id) })
      })
    })
  }
}

module.exports = new Gallery()
