/* globals io token commons _ translations socket */
import Vue from 'vue'
import Overlays from './index.vue'

function initOverlays () {
  if (typeof translations === 'undefined' || _.size(translations) === 0) return setTimeout(() => initOverlays(), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#overlays',
    data: {
      items: [],
      socket: io({ query: 'token=' + token })
    },
    render: function (createElement) {
      return createElement(Overlays, { props: { items: this.items, commons, socket, token } })
    }
  })
}

initOverlays()
