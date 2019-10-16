<template>
<div class="col">
  <div class="dashboardRemove" @click="remove">
    <fa icon="trash" /> {{translate('remove-dashboard')}}
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
    }
  },

  methods: {
    remove: function () {
      this.socket.emit('removeDashboard', this.dashboardId)
      this.$emit('removeDashboard', this.dashboardId)
    }
  }
}
</script>
