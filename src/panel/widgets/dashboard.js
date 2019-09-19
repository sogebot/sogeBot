/* globals io token commons _ socket configuration */
import Vue from 'vue';
import Dashboard from './dashboard.vue';

import { isAvailableVariable, isMainLoaded } from '../helpers/isAvailableVariable';

async function initDashboard () {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
    isMainLoaded(),
  ]);

  new Vue({ // eslint-disable-line no-new
    el: '#dashboard',
    data: {
      items: [],
      dashboards: [],
      socket: io({ query: 'token=' + token }),
    },
    created: function () {
      this.socket.emit('getWidgets', (items, dashboards) => {
        this.items = _.orderBy(items, 'id', 'asc');
        for (const item of this.items) {
          if (typeof item.dashboardId === 'undefined') {
            item.dashboardId = null;
          }
        }
        dashboards.push({
          createdAt: 0,
          name: 'Main',
          id: null,
        });
        this.dashboards = _.orderBy(dashboards, 'createdAt', 'asc');
      });
    },
    render: function (createElement) {
      return createElement(Dashboard, { props: { items: this.items, commons, socket, token, configuration, dashboards: this.dashboards } });
    },
  });
}

initDashboard();
