<template>
  <div id="emotes">
    <transition name="fade">
      <img
        v-if="url !== null && count >= threshold"
        :src="url" width="100%" />
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from '@vue/composition-api'
import { getSocket } from 'src/panel/helpers/socket';

const socket = getSocket('/overlays/emotes', true);
export default defineComponent({
  setup() {
    const threshold = ref(3);
    const url = ref(null as null | string);
    const count = ref(0);

    onMounted(() => {
      socket.on('combo', (opts: { count: number; url: string; threshold: number }) => {
        console.groupCollapsed('combo update received')
        console.log({...opts});
        console.groupEnd();
        threshold.value = opts.threshold;
        url.value = opts.url;
        count.value = opts.count;
      });
    });
    return { threshold, url, count }
  }
});
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

#emotes {
  width: 100vw;
  height: 100vh;
}

img {
  max-width: 100vw;
  max-height: 100vh;
}
</style>