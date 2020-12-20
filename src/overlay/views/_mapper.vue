<template>
  <component :is="type" />
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api'
import { getSocket } from 'src/panel/helpers/socket';
import type { OverlayMapperInterface } from 'src/bot/database/entity/overlay';

const socket = getSocket('/registries/overlays', true);
export default defineComponent({
  components: {
    alerts: () => import('./alerts.vue'),
    bets: () => import('./bets.vue'),
    carousel: () => import('./carousel.vue'),
    clips: () => import('./clips.vue'),
    clipscarousel: () => import('./clipscarousel.vue'),
    credits: () => import('./credits.vue'),
    emotes: () => import('./emotes.vue'),
    emotescombo: () => import('./emotescombo.vue'),
    eventlist: () => import('./eventlist.vue'),
    polls: () => import('./polls.vue'),
    randomizer: () => import('./randomizer.vue'),
    stats: () => import('./stats.vue'),
    tts: () => import('./tts.vue'),
  },
  setup(props, ctx) {
    const type = ref(null as null | string)
    onMounted(async () => {
      try {
        if (!ctx.root.$route.params.id) {
          throw new Error('Unknown overlay link!');
        }

        type.value = await new Promise((resolve, reject) => {
          socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string, data: OverlayMapperInterface) => {
            if (err || !data) {
              reject('Unknown overlay link ' + ctx.root.$route.params.id + '!')
            } else {
              resolve(data.value);
            }
          })
        })
      } catch (e) {
        console.error(e);
      }
    })

    return { type }
  }
});
</script>

<style>

</style>