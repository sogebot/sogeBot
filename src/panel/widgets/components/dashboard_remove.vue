<template lang="pug">
  b-col
    div(@click="remove").dashboardRemove
      fa(icon="trash")
      | {{ translate('remove-dashboard') }}
</template>

<script>
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';

export default {
  props: ['dashboardId'],

  data: function () {
    return {
      translate,
      socket: getSocket('/'),
    };
  },

  methods: {
    remove: function () {
      this.socket.emit('panel::dashboards::remove', {
        userId: this.$store.state.loggedUser.id, type: 'admin', id: this.dashboardId,
      }, (err) => {
        if (err) {
          console.error(err);
        }
      });
      this.$emit('removeDashboard', this.dashboardId);
    },
  },
};
</script>
