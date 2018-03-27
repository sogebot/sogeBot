'use strict'

const fs = require('fs')
const crypto = require('crypto')
const glob = require('glob')
const path = require('path')

const carouselDir = './public/dist/carousel/'

if (!fs.existsSync(carouselDir)) fs.mkdirSync(carouselDir)

function ImageCarousel () {
  if (require('cluster').isMaster) {
    global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
    global.panel.socketListening(this, 'overlay.images.get', this._get)
    global.panel.socketListening(this, 'overlay.image.delete', this._delete)
    global.panel.socketListening(this, 'overlay.image.upload', this._upload)
  }
}

ImageCarousel.prototype._get = function (self, socket) {
  glob(carouselDir + '*', function (err, files) {
    if (err) return

    files = files.map(function (match) {
      return path.relative(carouselDir, match)
    })
    socket.emit('overlay.image.list', files)
  })
}

ImageCarousel.prototype._delete = function (self, socket, data) {
  fs.unlink(carouselDir + data, function (err) {
    if (err) { return }

    self._get(self, socket)
  })
}

ImageCarousel.prototype._upload = function (self, socket, data) {
  var matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (matches.length !== 3) { return false }

  var type = matches[1]
  var buffer = Buffer.from(matches[2], 'base64')
  var ext

  if (type === 'image/jpeg') ext = 'jpg'
  if (type === 'image/png') ext = 'png'

  fs.writeFile(carouselDir + crypto.randomBytes(20).toString('hex') + '.' + ext, buffer, function (err) {
    if (err) {
      socket.emit('overlay.image.upload.failed')
      return
    }
    socket.emit('overlay.image.upload.success')
    self._get(self, socket)
  })
}

module.exports = new ImageCarousel()
