<template>
<div class="col">
  <div class="widgetAdd" @click="load" v-if="state < 2">
    <span v-if="state === 0">
      <font-awesome-icon icon="plus" /> {{commons.translate('add-widget')}}
    </span>
    <span v-if="state === 1">
      <font-awesome-icon icon="spinner" spin /> Loading data from server.
    </span>
  </div>
  <div v-else class="list-group">
    <a
      v-for="widget of widgets"
      :key="widget.id"
      href="#"
      @click="add(widget.id)"
      class="list-group-item list-group-item-action">
      <font-awesome-icon :icon="widget.icon.split(' ').map(o => o.replace('fa-', ''))" fixed-width />
      <span>{{commons.translate(widget.name).toUpperCase()}}</span>
    </a>
    <a
      @click="state = 0"
      href="#"
      class="list-group-item list-group-item-action">
      <font-awesome-icon icon="times" fixed-width />
      <span style="font-size:1rem; text-transform:uppercase;">{{commons.translate('close')}}</span>
    </a>
  </div>
</div>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import { faPlus, faSpinner, faTimes, faGift, faHeadphones, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { faMoneyBillAlt, faComments } from '@fortawesome/free-regular-svg-icons';
import { faTwitch, faSpotify } from '@fortawesome/free-brands-svg-icons';


library.add(faPlus, faSpinner, faTimes, faTwitch, faGift, faHeadphones, faMoneyBillAlt, faComments, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faSpotify, faCalendar)

export default {
  props: ['socket', 'commons', 'dashboardId'],
  data: function () {
    return {
      widgets: [],
      state: 0
    }
  },
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  methods: {
    add: function (widgetId) {
      this.socket.emit('addWidget', widgetId, this.dashboardId, (widget) => {
        this.$emit('addWidget', { widget, dashboardId: this.dashboardId })
      })
      this.state = 0
    },
    load: function () {
      this.state = 1
      this.socket.emit('getWidgetList', (widgets, dashboards) => {
        this.widgets = widgets
        this.state = 2
      })
    }
  }
}
</script>
