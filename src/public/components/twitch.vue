<template>
  <b-container
    fluid
    class="w-100 p-0"
    style="height: calc(100vh - 40px) !important"
  >
    <b-row
      no-gutters
      style="height: 100%"
    >
      <b-col
        cols="12"
        md="9"
        lg="9"
        xl="10"
      >
        <b-alert
          v-if="!isHttps"
          variant="danger"
          show
        >
          You need to run this page on HTTPS with valid certificate for this embed to be working. Ask your streamer to run on HTTPS.
        </b-alert>
        <iframe
          v-else
          :src="videoUrl"
          height="100%"
          width="100%"
          frameborder="0"
          scrolling="no"
          allowfullscreen="true"
        />
      </b-col>
      <b-col
        cols="0"
        md="3"
        lg="3"
        xl="2"
      >
        <iframe
          frameborder="0"
          scrolling="no"
          :src="chatUrl"
          height="100%"
          width="100%"
        />
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import {
  computed, defineComponent, onMounted, ref,
} from '@vue/composition-api';
import { get } from 'lodash-es';

const socket = getSocket('/widgets/chat', true);

export default defineComponent({
  setup(props, ctx) {
    const room = ref('');
    const theme = ref('light');

    onMounted(() => {
      socket.emit('room', (err: string | null, _room: string) => {
        room.value = _room;
      });

      setInterval(() => {
        theme.value = (localStorage.getItem('theme') || get(ctx.root.$store.state, 'configuration.core.ui.theme', 'light'));
      }, 100);
    });

    const isHttps = computed(() => {
      return window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    });

    const videoUrl = computed(() => {
      return `${window.location.protocol}//player.twitch.tv/?channel=${room.value}&autoplay=true&parent=${window.location.hostname}`;
    });

    const chatUrl = computed(() => {
      return window.location.protocol
        + '//twitch.tv/embed/'
        + room.value
        + '/chat'
        + (theme.value === 'dark' ? '?darkpopout' : '')
        + (theme.value === 'dark' ? '&parent=' + window.location.hostname : '?parent=' + window.location.hostname);
    });

    return {
      isHttps, videoUrl, chatUrl,
    };
  },
});
</script>