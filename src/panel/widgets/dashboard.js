/* globals commons _ socket configuration */
import Vue from 'vue';
import Dashboard from './dashboard.vue';

import { isMainLoaded } from '../helpers/isAvailableVariable';
import { getSocket } from 'src/panel/helpers/socket';
import { orderBy } from 'lodash-es';

async function initDashboard () {
  await Promise.all([
    isMainLoaded(),
  ]);

  new Vue({ // eslint-disable-line no-new
    el: '#dashboard',
    data: {
      items: [],
      dashboards: [],
      socket: getSocket('/'),
    },
    created: function () {
      this.socket.emit('getWidgets', (items, dashboards) => {
        this.items = orderBy(items, 'id', 'asc');
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
        this.dashboards = orderBy(dashboards, 'createdAt', 'asc');
      });
    },
    render: function (createElement) {
      return createElement(Dashboard, { props: { items: this.items, socket, configuration, dashboards: this.dashboards } });
    },
  });
}

initDashboard();
