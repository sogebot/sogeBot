'use strict'

const _ = require('lodash')

function CommercialWidget () {
  if (global.commons.isSystemEnabled('commercial')) {
    global.panel.addWidget('commercial', 'widget-title-commercial', 'fas fa-dollar-sign')
    global.panel.socketListening(this, 'commercial.run', this.runCommercial)
  }
}

CommercialWidget.prototype.runCommercial = async function (self, socket, data) {
  _.sample(require('cluster').workers).send({ type: 'message', sender: { username: global.commons.getOwner() }, message: '!commercial ' + data.seconds, skip: true })
}

module.exports = new CommercialWidget()
