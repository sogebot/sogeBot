/* globals token commons _ translations configuration systems */
import Vue from 'vue'
import Checklist from './checklist.vue'

function initChecklist () {
  const isTranslationsLoaded = typeof translations === 'undefined' || _.size(translations) === 0
  const isConfigurationLoaded = typeof configuration === 'undefined' || _.size(configuration) === 0
  if (isTranslationsLoaded || isConfigurationLoaded) return setTimeout(() => initChecklist(), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#checklist',
    data: {
      items: []
    },
    render: function (createElement) {
      if (typeof systems !== 'undefined') {
        return createElement(Checklist, { props: { commons, token, systems } })
      } else {
        return false
      }
    }
  })
}

initChecklist()
