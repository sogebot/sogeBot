/* globals io token */

var Vue = require('vue')

var YTplayer = require('./ytplayer.vue')

const socket = io({ query: 'token=' + token })

socket.emit('getWidgetList')
socket.on('widgets', (data) => {
  new Vue({ // eslint-disable-line no-new
    el: '#widgets',
    components: {
      //ytplayerwidget: YTplayer
    },
    render: function (createElement) {
      return createElement('div', [
        createElement('div', 'test me')
      ]
      )
    }
    /*template: '<template></template>',
    render: function (createElement) {
      return createElement([
        createElement('div', 'test me')
        //, createElement(YTplayer)
      ])
    }*/
  })
})
