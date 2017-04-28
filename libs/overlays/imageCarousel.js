'use strict'

function ImageCarousel () {
  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'overlay.images.get', this._get)
  global.panel.socketListening(this, 'overlay.image.upload', this._upload)
}

ImageCarousel.prototype._get = function (self, socket) {
}

ImageCarousel.prototype._upload = function (self, socket, data) {
  console.log(data)
}

module.exports = new ImageCarousel()
