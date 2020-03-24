<template lang="pug">
  b-container.fluid.pt-2
    b-row
      b-col
        span.title.text-default.mb-2 {{ translate('menu.playlist') }}

    panel
      template(v-slot:left)
        button-with-icon(icon="caret-left" href="#/").btn-secondary.btn-reverse {{translate('commons.back')}}

    loading(v-if="state.loading.playlist !== $state.success")
    b-table(v-else striped small :items="playlist" :fields="fields" @row-clicked="linkTo($event)").table-p-0
      template(v-slot:cell(thumbnail)="data")
        img(v-bind:src="generateThumbnail(data.item.videoId)").float-left.pr-3
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

import { getSocket } from 'src/panel/helpers/socket';

@Component({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  }
})
export default class playlist extends Vue {
  socket = getSocket('/systems/songs', true);

  playlist: {
    endTime: number; forceVolume: boolean; lastPlayedAt: number; length_seconds: number;
    loudness: number; seed: number; startTime: number; title: string; videoId: string;
    volume: number; _id: string;
  }[] = [];

  state: {
    loading: {
      playlist: number
    }
   } = {
     loading: {
       playlist: this.$state.progress
     }
  };

  fields = [
    { key: 'thumbnail', label: '', tdClass: 'fitThumbnail' },
    { key: 'title', label: '' },
    { key: 'buttons', label: '' },
  ];

  mounted() {
    this.state.loading.playlist = this.$state.progress;
    this.socket.emit('find.playlist', {}, (items, count) => {
      console.debug('Loaded', {playlist: items})
      for (let item of items) {
        item.startTime = item.startTime ? item.startTime : 0
        item.endTime = item.endTime ? item.endTime : item.length_seconds
      }
      this.playlist = items
      this.state.loading.playlist = this.$state.success;
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
