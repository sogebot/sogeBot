'use strict'

class JoinPartWidget {
  constructor () {
    global.panel.addWidget('joinpart', 'widget-title-joinpart', 'sign-in')
  }

  send (event) {
    global.panel.io.emit('joinpart', { username: event.username, type: event.type })
  }
}

module.exports = new JoinPartWidget()
