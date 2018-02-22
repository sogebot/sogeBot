'use strict'

class JoinPartWidget {
  constructor () {
    global.panel.addWidget('joinpart', 'widget-title-joinpart', 'fas fa-sign-in-alt')
  }

  send (event) {
    global.panel.io.emit('joinpart', { username: event.username, type: event.type })
  }
}

module.exports = new JoinPartWidget()
