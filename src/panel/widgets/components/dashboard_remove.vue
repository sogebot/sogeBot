<template lang="pug">
  b-col
    div(@click="remove").dashboardRemove
      fa(icon="trash")
      | {{ translate('remove-dashboard') }}
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
      this.socket.emit('panel::dashboards::remove', Number(this.$loggedUser.id), 'admin', this.dashboardId, (err) => {
        if (err) {
          console.error(err);
        }
      })
      this.$emit('removeDashboard', this.dashboardId)
    }
  }
}
</script>
