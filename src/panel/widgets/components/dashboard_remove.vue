<template>
<div class="col">
  <div class="dashboardRemove" @click="remove">
    <fa icon="trash" /> {{commons.translate('remove-dashboard')}}
  </div>
</div>
</template>

<script>
export default {
  props: ['socket', 'commons', 'dashboardId'],
  methods: {
    remove: function () {
      this.socket.emit('removeDashboard', this.dashboardId)
      this.$emit('removeDashboard', this.dashboardId)
    }
  }
}
</script>
