<template lang="pug">
  b-container(ref="songrequests" style="min-height: calc(100vh - 49px);").fluid.pt-2
    b-row
      b-col
        span.title.text-default.mb-2 {{ translate('song-requests') }}

    panel
      template(v-slot:left)
        button-with-icon(icon="caret-left" href="#/").btn-secondary.btn-reverse {{translate('commons.back')}}

    loading(v-if="state.loading.requests !== $state.success")
    b-table(v-else striped small :items="requests" :fields="fields" @row-clicked="linkTo($event)").table-p-0
      template(v-slot:cell(thumbnail)="data")
        img(v-bind:src="generateThumbnail(data.item.videoId)").float-left.pr-3
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import VueScrollTo from 'vue-scrollto';

import { getSocket } from 'src/panel/helpers/socket';

@Component({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  }
})
export default class songrequest extends Vue {
  socket = getSocket('/systems/songs', true);

  requests: {
    endTime: number; forceVolume: boolean; lastPlayedAt: number; length_seconds: number;
    loudness: number; seed: number; startTime: number; title: string; videoID: string;
    volume: number; _id: string;
  }[] = [];

  interval: number = 0;

  state: {
    loading: {
      requests: number
    }
   } = {
     loading: {
       requests: this.$state.progress
     }
  };

  fields = [
    { key: 'thumbnail', label: '', tdClass: 'fitThumbnail' },
    { key: 'title', label: '' },
    { key: 'username', label: '' },
  ];

  destroy() {
    clearInterval(this.interval);
  }

  mounted() {
    this.state.loading.requests = this.$state.progress;
    setInterval(() => {
      this.socket.emit('songs::getAllRequests', {}, (err, items) => {
        console.debug('Loaded', {requests: items})
        this.requests = items
        this.state.loading.requests = this.$state.success;
      })
    }, 2000)
    this.$nextTick(() => {
      VueScrollTo.scrollTo(this.$refs.songrequests as Element, 500, { container: 'body', force: true, cancelable: true, offset: -49 })
    })
  }

  generateThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/1.jpg`
  }

  linkTo(item) {
    console.debug('Clicked', item.videoId);
    window.location.href = `http://youtu.be/${item.videoId}`;
  }
}
  </script>

<style>
.table-p-0 td {
  padding: 0 !important;
}
.fitThumbnail {
  width: 100px;
}
</style>
