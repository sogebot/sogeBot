<template>
<div class="col">
  <div class="widgetAdd" @click="load" v-if="state < 2">
    <span v-if="state === 0">
      <fa icon="plus" /> {{translate('add-widget')}}
    </span>
    <span v-if="state === 1">
      <fa icon="spinner" spin /> Loading data from server.
    </span>
  </div>
  <div v-else class="list-group">
    <a
      v-for="widget of widgets"
      :key="widget.id"
      href="#"
      @click="add(widget.id)"
      class="list-group-item list-group-item-action">
      <fa :icon="widget.icon.split(' ').map(o => o.replace('fa-', ''))" fixed-width />
      <span>{{translate(widget.name).toUpperCase()}}</span>
    </a>
    <a
      @click="state = 0"
      href="#"
      class="list-group-item list-group-item-action">
      <fa icon="times" fixed-width />
      <span style="font-size:1rem; text-transform:uppercase;">{{translate('close')}}</span>
    </a>
  </div>
</div>
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
export default {
  props: ['dashboardId'],
  data: function () {
    return {
      socket: getSocket('/'),
      widgets: [],
      state: 0
    }
  },
  methods: {
    add: function (widgetId) {
      this.socket.emit('addWidget', widgetId, this.dashboardId, () => {
        this.$emit('addWidget')
      })
      this.state = 0
    },
    load: function () {
      this.state = 1
      this.socket.emit('panel::availableWidgets', { userId: Number(this.$loggedUser.id), type: 'admin' }, (err, widgets) => {
        if (err) {
          return console.error(err);
        }
        this.widgets = widgets;
        this.state = 2
      })
    }
  }
}
</script>
