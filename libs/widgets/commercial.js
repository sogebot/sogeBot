'use strict'

function CommercialWidget () {
  if (global.commons.isSystemEnabled('commercial')) {
    global.panel.addWidget('commercial', 'widget-title-commercial', 'usd')
    global.panel.socketListening(this, 'commercial.run', this.runCommercial)
  }
}

CommercialWidget.prototype.runCommercial = function (self, socket, data) {
  global.parser.parse({ username: global.parser.getOwner() }, '!commercial ' + data.seconds)
}

module.exports = new CommercialWidget()
