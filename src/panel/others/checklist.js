/* globals commons _ translations configuration systems */
import Vue from 'vue'
import Checklist from './checklist.vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
Vue.component('fa', FontAwesomeIcon);

function initChecklist () {
  const isTranslationsLoaded = typeof translations === 'undefined' || Object.keys(translations).length === 0
  const isConfigurationLoaded = typeof configuration === 'undefined' || Object.keys(configuration).length === 0
  if (isTranslationsLoaded || isConfigurationLoaded) return setTimeout(() => initChecklist(), 10)
  new Vue({ // eslint-disable-line no-new
    el: '#checklist',
    data: {
      items: []
    },
    render: function (createElement) {
      if (typeof systems !== 'undefined') {
        return createElement(Checklist, { props: { systems } })
      } else {
        return false
      }
    }
  })
}

initChecklist()
