'use strict'

const fs = require('fs')
const crypto = require('crypto')
const glob = require('glob')
const path = require('path')
const _ = require('lodash')

const galleryDir = './public/dist/gallery/'

if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir)

function Gallery () {
  global.panel.addMenu({category: 'settings', name: 'gallery', id: 'gallery'})
  global.panel.socketListening(this, 'overlay.gallery.get', this._get)
  global.panel.socketListening(this, 'overlay.gallery.delete', this._delete)
  global.panel.socketListening(this, 'overlay.gallery.upload', this._upload)
}

Gallery.prototype._get = function (self, socket) {
  glob(galleryDir + '*', function (err, files) {
    if (err) return

    files = files.map(function (match) {
      return path.relative(galleryDir, match)
    })
    socket.emit('overlay.gallery.list', files)
  })
}

Gallery.prototype._delete = function (self, socket, data) {
  fs.unlink(galleryDir + data, function (err) {
    if (err) { return }

    self._get(self, socket)
  })
}

Gallery.prototype._upload = function (self, socket, data) {
  var matches = data.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/)
  if (_.isNull(matches) || matches.length !== 3) { socket.emit('overlay.gallery.upload.failed'); return false }

  var type = matches[1]
  var buffer = Buffer.from(matches[2], 'base64')
  var ext

  if (type === 'image/jpeg') ext = 'jpg'
  if (type === 'image/png') ext = 'png'
  if (type === 'image/gif') ext = 'gif'
  if (type === 'audio/mp3') ext = 'mp3'
  if (type === 'audio/ogg') ext = 'png'
  if (type === 'video/mp4') ext = 'mp4'

  if (_.isNil(type)) { socket.emit('overlay.gallery.upload.failed'); return false }

  fs.writeFile(galleryDir + crypto.randomBytes(5).toString('hex') + '.' + ext, buffer, function (err) {
    if (err) {
      socket.emit('overlay.gallery.upload.failed')
      return
    }
    socket.emit('overlay.gallery.upload.success')
    self._get(self, socket)
  })
}

module.exports = new Gallery()
