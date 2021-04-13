<template>
  <component
    :is="type.value"
    v-if="type"
    :opts="type.opts"
  />
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import {
  defineComponent, onMounted, ref,
} from '@vue/composition-api';

import type { OverlayMapperInterface, OverlayMapperOBSWebsocket } from 'src/bot/database/entity/overlay';

const socket = getSocket('/registries/overlays', true);
export default defineComponent({
  components: {
    alerts:        () => import('./alerts.vue'),
    bets:          () => import('./bets.vue'),
    carousel:      () => import('./carousel.vue'),
    clips:         () => import('./clips.vue'),
    clipscarousel: () => import('./clipscarousel.vue'),
    credits:       () => import('./credits.vue'),
    emotes:        () => import('./emotes.vue'),
    emotescombo:   () => import('./emotescombo.vue'),
    eventlist:     () => import('./eventlist.vue'),
    obswebsocket:  () => import('./obswebsocket.vue'),
    polls:         () => import('./polls.vue'),
    randomizer:    () => import('./randomizer.vue'),
    stats:         () => import('./stats.vue'),
    tts:           () => import('./tts.vue'),
  },
  setup(props, ctx) {
    const type = ref(null as null | OverlayMapperInterface | OverlayMapperOBSWebsocket);
    onMounted(async () => {
      try {
        if (!ctx.root.$route.params.id) {
          throw new Error('Unknown overlay link!');
        }

        type.value = await new Promise((resolve, reject) => {
          socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string, data: OverlayMapperInterface | OverlayMapperOBSWebsocket) => {
            if (err || !data) {
              reject('Unknown overlay link ' + ctx.root.$route.params.id + '!');
            } else {
              resolve(data);
            }
          });
        });
      } catch (e) {
        console.error(e);
      }
    });

    return { type };
  },
});
</script>

<style>

</style>