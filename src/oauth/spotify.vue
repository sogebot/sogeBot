<template>
  <div id="app">
    <div v-if="state === false">Unexpected error, please try to authenticate again</div>
    <div v-if="state === true">Saving token to a bot, refreshing back to a bot.</div>
  </div>
</template>

<script lang="ts">
import { ref, Ref } from "@vue/composition-api";
import { getSocket } from '../panel/helpers/socket';

export default {
  setup() {
    const socket = getSocket('/integrations/spotify');
    let state: Ref<boolean | null> = ref(true);

    if(window.location.hash || window.location.search) {
      socket.emit('state', (err, state) => {
        let urlState = '';
        let urlCode = '';
        for (let url of window.location.search.split('&')) {
          if (url.startsWith('?code=') || url.startsWith('code=')) {
            urlCode = url.replace(/\??code=/, '')
          }
          if (url.startsWith('?state=') || url.startsWith('state=')) {
            urlState = url.replace(/\??state=/, '')
          }
        }

        if (urlState === state) {
          state = false;
          socket.emit('code', urlCode, (err, cb) => {
            window.location.href = window.location.origin + "/#/settings/integrations/spotify"
          })
        }
      })
    }

    return {
      socket,
      state,
    };
  }
};
</script>