'use strict'

function EventList () {
  global.panel.addWidget('eventlist', 'eventlist', 'far fa-calendar')
  global.panel.socketListening(this, 'widget.eventlist.get', this._get)
  global.panel.socketListening(this, 'widget.eventlist.cleanup', this._cleanup)

  global.configuration.register('widgetEventlistFollows', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistHosts', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistRaids', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistCheers', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistSubs', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistSubgifts', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistSubcommunitygifts', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistResubs', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistTips', 'core.no-response-bool', 'bool', true)
  global.configuration.register('widgetEventlistShow', 'core.no-response', 'number', 5)
  global.configuration.register('widgetEventlistSize', 'core.no-response', 'number', 20)
  global.configuration.register('widgetEventlistMessageSize', 'core.no-response', 'number', 15)
}

EventList.prototype._get = async function (self) {
  try {
    const limit = await global.configuration.getValue('widgetEventlistShow');
    let events = await global.db.engine.find('widgetsEventList', {
      _sort: 'timestamp',
      _total: limit,
    });
    global.panel.io.emit('widget.eventlist', events);
  } catch (e) {
    global.panel.io.emit('widget.eventlist', [])
  }
}

EventList.prototype._cleanup = function (self) {
  global.db.engine.remove('widgetsEventList', {});
}

module.exports = new EventList()
