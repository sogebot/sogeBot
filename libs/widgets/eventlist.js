'use strict'

// 3rdparty libraries
var _ = require('lodash')

function EventList () {
  global.panel.addWidget('eventlist', 'eventlist', 'far fa-calendar')
  global.panel.socketListening(this, 'widget.eventlist.get', this._get)

  global.configuration.register('widgetEventlistFollows', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistHosts', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistCheers', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistSubs', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistSubgifts', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistResubs', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistTips', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistShow', 'core.no-response', 'number', 5)
  global.configuration.register('widgetEventlistOverflowHeight', 'core.no-response', 'number', 500)
  global.configuration.register('widgetEventlistSize', 'core.no-response', 'number', 20)
  global.configuration.register('widgetEventlistMessageSize', 'core.no-response', 'number', 15)
}

EventList.prototype._get = async function (self) {
  let events = await global.db.engine.find('widgetsEventList')
  global.panel.io.emit('widgets.eventlist', _.chunk(_.orderBy(events, 'timestamp', 'desc'), 50)[0])
}
module.exports = new EventList()
