'use strict'

class JoinPartWidget {
  constructor () {
    global.panel.addWidget('join', 'widget-title-join', 'fas fa-sign-in-alt')
    global.panel.addWidget('part', 'widget-title-part', 'fas fa-sign-out-alt')
  }

  send (event) {
    global.panel.io.emit('joinpart', { username: event.username, type: event.type })
  }
}

module.exports = new JoinPartWidget()
