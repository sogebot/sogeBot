<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.obswebsocket') }}
        </span>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api'

import { getSocket } from 'src/panel/helpers/socket';
const socket = getSocket('/registries/obswebsocket')

export default defineComponent({
  components: {
    loading: () => import('src/panel/components/loading.vue'),
  },
  setup(props, ctx) {
    console.log(socket);
    return {

    }
  }
});
</script>
