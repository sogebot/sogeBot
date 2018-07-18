/* globals io token commons _ translations socket */

var Vue = require('vue')

const Widgets = require('./widgets.vue')

function initWidgets () {
  if (typeof translations === 'undefined' || _.size(translations) === 0) return setTimeout(() => initWidgets(), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#widgets',
    data: {
      _rerender: false,
      _grid: false,
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
      return createElement(Widgets, { props: { items: this.items, commons, socket } })
    }
  })
}

initWidgets()
