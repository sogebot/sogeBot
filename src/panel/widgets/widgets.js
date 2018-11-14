/* globals io token commons _ translations socket configuration */
import Vue from 'vue'
import Widgets from './widgets.vue'

function initWidgets () {
  const isTranslationsLoaded = typeof translations === 'undefined' || _.size(translations) === 0
  const isConfigurationLoaded = typeof configuration === 'undefined' || _.size(configuration) === 0
  if (isTranslationsLoaded || isConfigurationLoaded) return setTimeout(() => initWidgets(), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#widgets',
    data: {
      items: [],
      socket: io({ query: 'token=' + token })
    },
    created: function () {
      this.socket.emit('getWidgetList')
      this.socket.on('widgets', (items) => {
        this.items = _.orderBy(items, 'id', 'asc')
      })
    },
    render: function (createElement) {
      return createElement(Widgets, { props: { items: this.items, commons, socket, token, configuration } })
    }
  })
}

initWidgets()
