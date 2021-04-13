<template lang="pug">
  b-container(ref="songrequestsRef" style="min-height: calc(100vh - 49px);").fluid.pt-2
    b-row
      b-col
        span.title.text-default.mb-2 {{ translate('song-requests') }}

    panel
      template(v-slot:left)
        button-with-icon(icon="caret-left" href="#/").btn-secondary.btn-reverse {{translate('commons.back')}}

    loading(v-if="state.loading !== $state.success")
    b-table(v-else striped small :items="requests" :fields="fields" @row-clicked="linkTo($event)").table-p-0
      template(v-slot:cell(thumbnail)="data")
        img(v-bind:src="generateThumbnail(data.item.videoId)").float-left.pr-3
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, ref,
} from '@vue/composition-api';
import VueScrollTo from 'vue-scrollto';

import { SongRequestInterface } from 'src/bot/database/entity/song';
import { ButtonStates } from 'src/panel/helpers/buttonStates';

const socket = getSocket('/systems/songs', true);

export default defineComponent({
  components: { loading: () => import('src/panel/components/loading.vue') },
  setup(props, ctx) {
    const requests = ref([] as SongRequestInterface[]);
    const songrequestsRef = ref(null as Element | null);

    const state = ref({ loading: ButtonStates.progress } as {
      loading: number;
    });

    const fields = [
      {
        key: 'thumbnail', label: '', tdClass: 'fitThumbnail',
      },
      { key: 'title', label: '' },
      { key: 'username', label: '' },
    ];

    const moveTo = () => {
      VueScrollTo.scrollTo(songrequestsRef.value as Element, 500, {
        container: 'body',
        force:     true,
        offset:    -49,
        onDone:    function() {
          const scrollPos = window.scrollY || document.getElementsByTagName('html')[0].scrollTop;
          if (scrollPos === 0) {
            setTimeout(() => moveTo(), 100);
          }
        },
      });
    };

    onMounted(() => {
      state.value.loading = ButtonStates.progress;
      setInterval(() => {
        socket.emit('songs::getAllRequests', {}, (err: string | null, items: SongRequestInterface[]) => {
          console.debug('Loaded', { requests: items });
          requests.value = items;
          state.value.loading = ButtonStates.success;
        });
      }, 2000);
      ctx.root.$nextTick(() => {
        moveTo();
      });
    });

    const generateThumbnail = (videoId: string) => {
      return `https://img.youtube.com/vi/${videoId}/1.jpg`;
    };

    const linkTo = (item: SongRequestInterface) => {
      console.debug('Clicked', item.videoId);
      window.location.href = `http://youtu.be/${item.videoId}`;
    };

    return {
      generateThumbnail,
      linkTo,
      fields,
      requests,
      songrequestsRef,
      state,
      translate,
    };
  },
});
</script>

<style>
.table-p-0 td {
  padding: 0 !important;
}
.fitThumbnail {
  width: 100px;
}
</style>
