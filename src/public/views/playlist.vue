<template lang="pug">
  b-container(ref="playlist" style="min-height: calc(100vh - 49px);").fluid.pt-2
    b-row
      b-col
        span.title.text-default.mb-2 {{ translate('menu.playlist') }}

    panel
      template(v-slot:left)
        button-with-icon(icon="caret-left" href="#/").btn-secondary.btn-reverse {{translate('commons.back')}}
      template(v-slot:right)
        b-pagination(
          v-model="currentPage"
          :total-rows="count"
          :per-page="perPage"
          ).m-0

    loading(v-if="state.loading.playlist !== $state.success")
    b-table(v-else striped small :items="playlist" :fields="fields" @row-clicked="linkTo($event)").table-p-0
      template(v-slot:cell(thumbnail)="data")
        img(v-bind:src="generateThumbnail(data.item.videoId)").float-left.pr-3
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import VueScrollTo from 'vue-scrollto';

import { getSocket } from 'src/panel/helpers/socket';
import { SongPlaylistInterface } from '../../bot/database/entity/song';

@Component({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  }
})
export default class playlist extends Vue {
  socket = getSocket('/systems/songs', true);

  playlist: SongPlaylistInterface[] = [];

  currentPage = 1;
  perPage = 25;
  count: number = 0;

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

  @Watch('currentPage')
  refreshPlaylist() {
    this.state.loading.playlist = this.$state.progress;
    this.socket.emit('find.playlist', { page: (this.currentPage - 1) }, (err: string | null, items: SongPlaylistInterface[], count: number) => {
      if (err) {
        return console.error(err);
      }
      this.count = count;
      for (let item of items) {
        item.startTime = item.startTime ? item.startTime : 0
        item.endTime = item.endTime ? item.endTime : item.length
      }
      this.playlist = items
      this.state.loading.playlist = this.$state.success;
    })
  }

  mounted() {
    this.refreshPlaylist();
    this.$nextTick(() => {
      VueScrollTo.scrollTo(this.$refs.playlist as Element, 500, { container: 'body', force: true, cancelable: true, offset: -49 })
    })
  }

  generateThumbnail(videoId: string) {
    return `https://img.youtube.com/vi/${videoId}/1.jpg`
  }

  linkTo(item: SongPlaylistInterface) {
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
