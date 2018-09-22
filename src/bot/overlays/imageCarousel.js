'use strict'

const _ = require('lodash')

class ImageCarousel {
  constructor () {
    if (require('cluster').isMaster) {
      global.panel.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' })

      this.sockets()
    }
  }

  sockets () {
    global.panel.io.of('/overlays/carousel').on('connection', (socket) => {
      socket.on('load', async (cb) => {
        let images = (await global.db.engine.find('overlay.carousel')).map((o) => { o._id = o._id.toString(); return o })
        cb(_.orderBy(images, 'order', 'asc'))
      })

      socket.on('delete', async (id, cb) => {
        await global.db.engine.remove('overlay.carousel', { _id: id })
        // force reorder
        let images = _.orderBy((await global.db.engine.find('overlay.carousel')).map((o) => { o._id = o._id.toString(); return o }), 'order', 'asc')
        for (let order = 0; order < images.length; order++) await global.db.engine.update('overlay.carousel', { _id: images[order]._id }, { order })
        cb(id)
      })

      socket.on('update', async (_id, data, cb) => {
        await global.db.engine.update('overlay.carousel', { _id }, data)
        cb(_id, data)
      })

      socket.on('move', async (go, id, cb) => {
        let images = (await global.db.engine.find('overlay.carousel')).map((o) => { o._id = o._id.toString(); return o })

        let image = _.find(images, (o) => o._id === id)
        let upImage = _.find(images, (o) => Number(o.order) === Number(image.order) - 1)
        let downImage = _.find(images, (o) => Number(o.order) === Number(image.order) + 1)

        switch (go) {
          case 'up':
            if (!_.isNil(upImage)) {
              await global.db.engine.update('overlay.carousel', { _id: image._id }, { order: Number(upImage.order) })
              await global.db.engine.update('overlay.carousel', { _id: upImage._id }, { order: Number(image.order) })
            }
            break
          case 'down':
            if (!_.isNil(downImage)) {
              await global.db.engine.update('overlay.carousel', { _id: image._id }, { order: Number(downImage.order) })
              await global.db.engine.update('overlay.carousel', { _id: downImage._id }, { order: Number(image.order) })
            }
            break
        }
        cb(id)
      })

      socket.on('upload', async (data, cb) => {
        var matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
        if (matches.length !== 3) { return false }

        var type = matches[1]
        var base64 = matches[2]

        let order = (await global.db.engine.find('overlay.carousel')).length
        let image = await global.db.engine.insert('overlay.carousel',
          { type,
            base64,
            // timers in ms
            waitBefore: 0,
            waitAfter: 0,
            duration: 5000,
            // animation
            animationInDuration: 1000,
            animationIn: 'fadeIn',
            animationOutDuration: 1000,
            animationOut: 'fadeOut',
            // order
            order })
        cb(image)
      })
    })
  }
}

module.exports = new ImageCarousel()
