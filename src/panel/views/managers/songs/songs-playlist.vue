<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.playlist') }}
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
                <fa icon="plus"></fa> {{ translate('systems.songs.add_or_import') }}</b-button>
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
        <img class="float-left pr-3" v-bind:src="generateThumbnail(data.item.videoID)">
      </template>
      <template v-slot:cell(title)="data">
        {{ data.item.title }}
        <small class="d-block">
          <fa :icon="[ 'far', 'clock' ]"></fa> {{ data.item.length_seconds | formatTime }}
          <fa class="pl-3" :icon="['fas', 'fa-volume-up']"></fa> {{ Number(data.item.volume).toFixed(1) }}%
          <fa class="pl-3" :icon="['fas', 'fa-step-backward']"></fa>
          {{ data.item.startTime | formatTime }} - {{ data.item.endTime | formatTime }}
          <fa icon="step-forward"></fa>
          <fa class="pl-3" :icon="['fas', 'fa-music']"/> {{ new Date(data.item.lastPlayedAt).toLocaleString() }}
        </small>
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="float-right pr-2" style="width: max-content !important;">
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" @click="data.toggleDetails">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="deleteItem(data.item._id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
      <template v-slot:row-details="data">
        <b-card>
          <div class="form-group col-md-12">
            <label style="margin: 0px 0px 3px; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">{{ translate('systems.songs.settings.volume') }}</label>
            <div class="input-group">
              <button class="btn" @click="data.item.forceVolume = false" :class="[!data.item.forceVolume ? ' btn-success' : 'btn-secondary']">{{translate('systems.songs.calculated')}}</button>
              <button class="btn" @click="data.item.forceVolume = true" :class="[data.item.forceVolume ? ' btn-success' : 'btn-secondary']">{{translate('systems.songs.set_manually')}}</button>
              <input v-model="data.item.volume" type="number" class="form-control" min=1 max=100 :disabled="!data.item.forceVolume">
              <div class="input-group-append">
                <div class="input-group-text">%</div>
              </div>
              <div class="invalid-feedback">{{ translate('systems.songs.error.isEmpty') }}</div>
            </div>
          </div>
          <div class="form-group col-md-6">
            <label style="margin: 0px 0px 3px; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">{{ translate('systems.songs.startTime') }}</label>
            <div class="input-group">
              <input v-model="data.item.startTime" type="number" class="form-control" min=1 :max="Number(data.item.endTime) - 1">
              <div class="input-group-append">
                <div class="input-group-text">{{translate('systems.songs.seconds')}}</div>
              </div>
              <div class="invalid-feedback">{{ translate('systems.songs.error.isEmpty') }}</div>
            </div>
          </div>
          <div class="form-group col-md-6">
            <label style="margin: 0px 0px 3px; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">{{ translate('systems.songs.endTime') }}</label>
            <div class="input-group">
              <input v-model="data.item.endTime" type="number" class="form-control" :min="Number(data.item.startTime) + 1" :max="data.item.length_seconds">
              <div class="input-group-append">
                <div class="input-group-text">{{translate('systems.songs.seconds')}}</div>
              </div>
              <div class="invalid-feedback">{{ translate('systems.songs.error.isEmpty') }}</div>
            </div>
          </div>
          <div class="form-group text-right col-md-12">
            <button type="button" class="btn btn-secondary" @click="data.toggleDetails">{{translate('events.dialog.close')}}</button>

            <button v-if="state.save === 0" type="button" class="btn btn-primary" v-on:click="updateItem(data.item._id)">{{ translate('dialog.buttons.saveChanges.idle') }}</button>
            <button v-if="state.save === 1" disabled="disabled" type="button" class="btn btn-primary"><fa icon="circle-notch" spin></fa> {{ translate('dialog.buttons.saveChanges.progress') }}</button>
            <button v-if="state.save === 2" disabled="disabled" type="button" class="btn btn-success"><fa icon="check"></fa> {{ translate('dialog.buttons.saveChanges.done') }}</button>
            <button v-if="state.save === 3" disabled="disabled" type="button" class="btn btn-danger"><fa icon="exclamation"></fa> {{ translate('dialog.buttons.something-went-wrong') }}</button>
          </div>
        </b-card>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from 'src/panel/helpers/socket';

import { Vue, Component/*, Watch */ } from 'vue-property-decorator';
import { isNil } from 'lodash-es';
import { escape } from 'xregexp';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
  filters: {
    formatTime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [
        h,
        m > 9 ? m : (h ? '0' + m : m || '0'),
        s > 9 ? s : '0' + s,
      ].filter(a => a).join(':');
    }
  }
})
export default class playlist extends Vue {
  socket = getSocket('/systems/songs');

  items: {
    endTime: number; forceVolume: boolean; lastPlayedAt: number; length_seconds: number;
    loudness: number; seed: number; startTime: number; title: string; videoID: string;
    volume: number; _id: string;
  }[] = [];
  search: string = '';
  toAdd: string = '';
  importInfo: string = '';
  state: {
    loading: number;
    save: number;
    import: number;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
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
    this.refreshPlaylist()
  }

  refreshPlaylist() {
    this.state.loading = this.$state.progress;
    this.socket.emit('find.playlist', {}, (err, items) => {
      for (let item of items) {
        item.startTime = item.startTime ? item.startTime : 0
        item.endTime = item.endTime ? item.endTime : item.length_seconds
      }
      this.items = items
      this.state.loading = this.$state.success;
    })
  }

  generateThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/1.jpg`
  }

  addSongOrPlaylist(evt) {
    if (evt) {
      evt.preventDefault()
    }
    if (this.state.import === 0) {
      this.state.import = 1
      this.socket.emit(this.toAdd.includes('playlist') ? 'import.playlist' : 'import.video', this.toAdd, (err, info) => {
        this.state.import = 2
        this.refreshPlaylist()
        this.toAdd = ''
        this.showImportInfo(info)
      })
    }
  }

  showImportInfo(info) {
    this.importInfo = `Imported: ${info.imported}, Skipped: ${info.skipped}`
    setTimeout(() => {
      this.importInfo = ''
      this.state.import = 0
    }, 5000)
  }

  updateItem(_id) {
    this.state.save = 1

    let item = this.items.find((o) => o._id === _id)
    if (item) {
      item.volume = Number(item.volume)
      item.startTime = Number(item.startTime)
      item.endTime = Number(item.endTime)
      this.socket.emit('update', {collection: 'playlist', items: [item]}, (err) => {
        if (err) {
          console.error(err)
          return this.state.save = 3
        }
        this.state.save = 2
        setTimeout(() => {
          this.state.save = 0
        }, 1000)
      })
    }
  }

  deleteItem(id) {
    this.socket.emit('delete.playlist', id, () => {
      this.items = this.items.filter((o) => o._id !== id)
    })
  }

  linkTo(item) {
    console.debug('Clicked', item.videoID);
    window.location.href = `http://youtu.be/${item.videoID}`;
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
