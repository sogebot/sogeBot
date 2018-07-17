/* globals io token $ commons _ translations */

var Vue = require('vue')

const ytplayer = require('./components/ytplayer.vue')
const chat = require('./components/chat.vue')

const socket = io({ query: 'token=' + token })

socket.emit('getWidgetList')
socket.on('widgets', (items) => {
  initWidgets(items)
})

function initWidgets (items) {
  if (_.size(translations) === 0) return setTimeout(() => initWidgets(items), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#widgets',
    components: {
      ytplayer,
      chat
    },
    render: function (createElement) {
      let i = items.map(o => {
        return createElement('div', {
          class: {
            'grid-stack-item': true
          },
          attrs: {
            id: `widget-${o.id}`,
            'data-gs-x': o.position.x,
            'data-gs-y': o.position.y,
            'data-gs-width': o.size.width,
            'data-gs-height': o.size.height
          }
        }, [
          createElement('div', {
            class: { 'grid-stack-item-content': true }
          }, [
            createElement(o.id, { props: { socket, commons } })
          ])
        ])
      })

      return createElement('div', {
        class: { 'widgets': true }
      }, [
        createElement('div', {
          class: {
            'grid-stack': true
          }
        }, i)
      ])
    }
  })

  // GRID INIT
  $('.grid-stack').gridstack({ cellHeight: 42, verticalMargin: 10, removable: true, removeTimeout: 100, handleClass: 'card-header' })
  $('.grid-stack').off('removed').on('removed', function (event, items) {
    let widgets = []
    for (let item of items) {
      widgets.push({
        id: item.el[0].id.split('-')[1],
        position: {
          x: item.x,
          y: item.y
        },
        size: {
          height: item.height,
          width: item.width
        }
      })
    }
    socket.emit('updateWidgets', widgets)
  })
  $('.grid-stack').off('change').on('change', function (event, items) {
    let widgets = []
    for (let item of $('.grid-stack-item')) {
      widgets.push({
        id: $(item).attr('id').split('-')[1],
        position: {
          x: $(item).attr('data-gs-x'),
          y: $(item).attr('data-gs-y')
        },
        size: {
          height: $(item).attr('data-gs-height'),
          width: $(item).attr('data-gs-width')
        }
      })
    }
    socket.emit('updateWidgets', widgets)
  })
}
