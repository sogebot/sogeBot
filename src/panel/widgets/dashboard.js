/* globals io token commons _ translations socket configuration */
import Vue from 'vue'
import Dashboard from './dashboard.vue'

function initDashboard () {
  const isTranslationsLoaded = typeof translations === 'undefined' || _.size(translations) === 0
  const isConfigurationLoaded = typeof configuration === 'undefined' || _.size(configuration) === 0
  if (isTranslationsLoaded || isConfigurationLoaded) return setTimeout(() => initDashboard(), 10)

  new Vue({ // eslint-disable-line no-new
    el: '#dashboard',
    data: {
      items: [],
      dashboards: [],
      socket: io({ query: 'token=' + token })
    },
    created: function () {
      this.socket.emit('getWidgets', (items, dashboards) => {
        this.items = _.orderBy(items, 'id', 'asc')
        for (const item of this.items) {
          if (typeof item.dashboardId === 'undefined') item.dashboardId = "0"
        }
        dashboards.push({
          createdAt: 0,
          name: 'Main',
          _id: "0"
        })
        this.dashboards = _.orderBy(dashboards, 'createdAt', 'asc')
      })
    },
    render: function (createElement) {
      return createElement(Dashboard, { props: { items: this.items, commons, socket, token, configuration, dashboards: this.dashboards } })
    }
  })
}

initDashboard()
