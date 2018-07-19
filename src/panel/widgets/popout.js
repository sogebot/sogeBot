/* globals io token commons _ translations socket page */

const Vue = require('vue')
const Popout = require('./popout.vue')

function initPopout () {
  if (typeof translations === 'undefined' || _.size(translations) === 0) return setTimeout(() => initPopout(), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#popout',
    data: {
      items: [],
      socket: io({ query: 'token=' + token })
    },
    render: function (createElement) {
      return createElement(Popout, { props: { commons, socket, page } })
    }
  })
}

initPopout()
