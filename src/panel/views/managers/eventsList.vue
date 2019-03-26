<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.events') }}
        </span>
      </div>
    </div>

    <panel ref="panel" class="pt-3 pb-3 mt-3 mb-3 m-0 border-top border-bottom row"
      :options="{
        leftButtons: [
          {
            href: '#/registry/events/edit',
            text: translate('managers.events.addNewEvent'),
            class: 'btn-primary',
            icon: 'plus'
          }
        ],
        hideTableButton: true
      }"
      @search="search = $event"></panel>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import * as io from 'socket.io-client';

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      holdButton: () => import('../../components/holdButton.vue'),
      'button-with-icon': () => import('../../components/button.vue'),
    },
    data: function () {
      const object: {
        socket: any,
      } = {
        socket: io('/core/events', { query: "token=" + this.token }),
      }
      return object
    },
  })
</script>

<style scoped>
</style>