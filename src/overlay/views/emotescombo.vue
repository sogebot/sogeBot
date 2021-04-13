<template>
  <div id="emotes">
    <div v-if="urlParam('debug')">
      <json-viewer
        :value="{threshold, url, count, inactivity, currentTime, updatedAt, isActive: currentTime - updatedAt < inactivity * 1000 }"
        boxed
        copyable
        :expand-depth="10"
      />
    </div>
    <transition name="fade">
      <img
        v-if="url !== null && count >= threshold && currentTime - updatedAt < inactivity * 1000"
        :src="url"
        width="100%"
      >
    </transition>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import {
  defineComponent, onMounted, ref,
} from '@vue/composition-api';
import JsonViewer from 'vue-json-viewer';

const socket = getSocket('/overlays/emotes', true);
export default defineComponent({
  components: { JsonViewer },
  setup() {
    const threshold = ref(3);
    const url = ref(null as null | string);
    const count = ref(0);
    const inactivity = ref(30);
    const updatedAt = ref(Date.now());
    const currentTime = ref(Date.now());

    setInterval(() => {
      currentTime.value = Date.now();
    }, 1000);

    onMounted(() => {
      socket.on('combo', (opts: { count: number; url: string; threshold: number; inactivity: number }) => {
        console.groupCollapsed('combo update received');
        console.log({ ...opts });
        console.groupEnd();
        threshold.value = opts.threshold;
        url.value = opts.url;
        count.value = opts.count;
        inactivity.value = opts.inactivity;
        updatedAt.value = Date.now();
      });
    });
    return {
      threshold, url, count, inactivity, updatedAt, currentTime,
    };
  },
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

.debug {
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
  color: white;
  padding: 1rem;
}
</style>