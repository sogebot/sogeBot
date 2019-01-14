<template>
<div class="col">
  <div class="dashboardRemove" @click="remove">
    <font-awesome-icon icon="trash" /> {{commons.translate('remove-dashboard')}}
  </div>
</div>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons';

library.add(faTrash)

export default {
  props: ['socket', 'commons', 'dashboardId'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  methods: {
    remove: function () {
      this.socket.emit('removeDashboard', this.dashboardId)
      this.$emit('removeDashboard', this.dashboardId)
    }
  }
}
</script>
