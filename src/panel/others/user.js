/* globals token commons _ translations configuration systems */
import Vue from 'vue'
import User from './user.vue'

function initUser () {
  const isTranslationsLoaded = typeof translations === 'undefined' || _.size(translations) === 0
  const isConfigurationLoaded = typeof configuration === 'undefined' || _.size(configuration) === 0
  if (isTranslationsLoaded || isConfigurationLoaded) return setTimeout(() => initUser(), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#user',
    data: {
      items: []
    },
    render: function (createElement) {
      if (typeof systems !== 'undefined') {
        return createElement(User, { props: { commons, token, systems } })
      } else {
        return false
      }
    }
  })
}

initUser()
