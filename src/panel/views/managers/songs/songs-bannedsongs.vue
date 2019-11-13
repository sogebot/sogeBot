<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.bannedsongs') }}
        </span>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <b-form inline @submit="addSongOrPlaylist">
          <b-input-group>
            <b-input input type="text" class="form-control w-auto col-6" v-model="toAdd" placeholder="Paste your youtube link, id or playlist link" />
            <b-input-group-append>
              <b-button type="submit" v-if="state.import == 0" variant="primary" class="btn mr-2" v-on:click="addSongOrPlaylist()">
                <fa icon="plus"></fa> {{ translate('systems.songs.add_song') }}</b-button>
              <b-button v-else-if="state.import == 1" class="btn mr-2" variant="info" disabled="disabled">
                <fa icon="circle-notch" spin></fa> {{ translate('systems.songs.importing') }}</b-button>
              <b-button v-else class="btn mr-2" variant="success" disabled="disabled">
                <fa icon="check"></fa> {{ translate('systems.songs.importing_done') }}</b-button>
            </b-input-group-append>
          </b-input-group>
          <div class="text-info">{{ importInfo }}</div>
        </b-form>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-table v-else striped small :items="fItems" :fields="fields" class="table-p-0" hover @row-clicked="linkTo($event)">
      <template v-slot:cell(thumbnail)="data">
        <img class="float-left pr-3" v-bind:src="generateThumbnail(data.item.videoId)">
      </template>
      <template v-slot:cell(title)="data">
        {{ data.item.title }}
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="float-right pr-2" style="width: max-content !important;">
          <hold-button @trigger="deleteItem(data.item.videoId)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from 'src/panel/helpers/socket';

import { Vue, Component/*, Watch */ } from 'vue-property-decorator';
import { isNil } from 'lodash-es';
import { escape } from 'xregexp';
import { SongBan } from '../../../../bot/entity/song';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  }
})
export default class playlist extends Vue {
  socket = getSocket('/systems/songs');

  items: SongBan[] = [];
  search: string = '';
  toAdd: string = '';
  importInfo: string = '';
  state: {
    loading: number;
    import: number;
  } = {
    loading: this.$state.progress,
    import: this.$state.idle,
  }

  fields = [
    { key: 'thumbnail', label: '', tdClass: 'fitThumbnail' },
    { key: 'title', label: '' },
    { key: 'buttons', label: '' },
  ];

  get fItems() {
    if (this.search.length === 0) return this.items
    return this.items.filter((o) => {
      const isSearchInTitle = !isNil(o.title.match(new RegExp(escape(this.search), 'ig')))
      return isSearchInTitle
    })
  }

  created() {
    this.refreshBanlist()
  }

  refreshBanlist() {
    this.state.loading = this.$state.progress;
    this.socket.emit('songs::getAllBanned', {}, (err, items) => {
      this.items = items
      this.state.loading = this.$state.success;
    })
  }

  generateThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/1.jpg`
  }

  deleteItem(id) {
    this.socket.emit('delete.ban', id, () => {
      this.items = this.items.filter((o) => o.videoId !== id)
    })
  }

  showImportInfo(info) {
    this.importInfo = `Banned: ${info.banned}`
    setTimeout(() => {
      this.importInfo = ''
      this.state.import = 0
    }, 5000)
  }

  addSongOrPlaylist(evt) {
    if (evt) {
      evt.preventDefault()
    }
    if (this.state.import === 0) {
      this.state.import = 1
      this.socket.emit('import.ban', this.toAdd, (err, info) => {
        this.state.import = 2
        this.refreshBanlist()
        this.toAdd = ''
        this.showImportInfo(info)
      })
    }
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
  width: 100px;;
}
</style>
