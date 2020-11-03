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
      <b-col v-if="!$systems.find(o => o.name === 'songs').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:right>
        <b-select v-model="showTag" class="mr-2">
          <b-form-select-option :value="null">All playlists</b-form-select-option>
          <b-form-select-option :value="tag" v-for="tag of tags" v-bind:key="tag">
            {{tag}}
            <template v-if="currentTag === tag">(current)</template>
          </b-form-select-option>
        </b-select>

        <b-pagination
          class="m-0"
          v-model="currentPage"
          :total-rows="count"
          :per-page="perPage"
          aria-controls="my-table"
        ></b-pagination>
      </template>
      <template v-slot:left>
        <b-form inline @submit="addSongOrPlaylist">
          <b-input-group>
            <b-input input type="text" class="form-control w-auto col-6" v-model="toAdd" placeholder="Paste your youtube link, id or playlist link" />
            <b-input-group-append>
              <b-button type="submit" v-if="state.import == 0" variant="primary" class="btn mr-2" v-on:click="addSongOrPlaylist()">
                <fa icon="plus"></fa> {{ translate('systems.songs.add_or_import') }}</b-button>
              <b-button-group v-else-if="state.import == 1">
                <b-button class="btn" variant="info" disabled="disabled">
                  <fa icon="circle-notch" spin fixed-width></fa> {{ translate('systems.songs.importing') }}</b-button>
                <b-button variant="danger" @click="stopImport()">
                  <fa icon="stop" fixed-width></fa></b-button>
              </b-button-group>
              <b-button v-else-if="state.import == 2" class="btn mr-2" variant="success" disabled="disabled">
                <fa icon="check"></fa> {{ translate('systems.songs.importing_done') }}</b-button>
              <b-button v-else class="btn mr-2" variant="danger" disabled="disabled">
                <fa icon="times"></fa> {{ translate('dialog.buttons.something-went-wrong') }}</b-button>
            </b-input-group-append>
          </b-input-group>
          <div class="text-info">{{ importInfo }}</div>
        </b-form>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-table v-else striped small :items="fItems" :fields="fields" class="table-p-0">
      <template v-slot:cell(thumbnail)="data">
        <img class="float-left pr-3" v-bind:src="generateThumbnail(data.item.videoId)">
      </template>
      <template v-slot:cell(title)="data">
        <div>
          {{ data.item.title }}
          <b-badge class="mr-1" :variant="getVariant(tag)" v-for="tag of data.item.tags" v-bind:key="tag"> {{ tag }}</b-badge>
        </div>
        <small class="d-block">
          <fa :icon="[ 'far', 'clock' ]"></fa> {{ data.item.length | formatTime }}
          <fa class="ml-3" :icon="['fas', 'volume-up']"></fa> {{ Number(data.item.volume).toFixed(1) }}%
          <fa class="ml-3" :icon="['fas', 'step-backward']"></fa>
          {{ data.item.startTime | formatTime }} - {{ data.item.endTime | formatTime }}
          <fa icon="step-forward"></fa>
          <fa class="ml-3" :icon="['fas', 'music']"/> {{ new Date(data.item.lastPlayedAt).toLocaleString() }}
        </small>
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="float-right pr-2" style="width: max-content !important;">
          <button-with-icon class="btn-only-icon btn-secondary btn-reverse" icon="link" :href="'http://youtu.be/' + data.item.videoId">
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" @click="data.toggleDetails">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="deleteItem(data.item.videoId)">
            {{ translate('dialog.buttons.delete') }}
          </button-with-icon>
        </div>
      </template>
      <template v-slot:row-details="data">
        <b-card>
          <b-row class="form-group">
            <b-col cols="12">
              <label>{{ translate('systems.songs.settings.volume') }}</label>
              <div class="input-group">
                <button class="btn" @click="data.item.forceVolume = false" :class="[!data.item.forceVolume ? ' btn-success' : 'btn-secondary']">{{translate('systems.songs.calculated')}}</button>
                <button class="btn" @click="data.item.forceVolume = true" :class="[data.item.forceVolume ? ' btn-success' : 'btn-secondary']">{{translate('systems.songs.set_manually')}}</button>
                <input v-model="data.item.volume" type="number" class="form-control" min=1 max=100 :disabled="!data.item.forceVolume">
                <div class="input-group-append">
                  <div class="input-group-text">%</div>
                </div>
                <div class="invalid-feedback">{{ translate('systems.songs.error.isEmpty') }}</div>
              </div>
            </b-col>
          </b-row>
          <b-row class="form-group">
            <b-col cols="6">
              <label>{{ translate('systems.songs.startTime') }}</label>
              <div class="input-group">
                <input v-model="data.item.startTime" type="number" class="form-control" min=1 :max="Number(data.item.endTime) - 1">
                <div class="input-group-append">
                  <div class="input-group-text">{{translate('systems.songs.seconds')}}</div>
                </div>
                <div class="invalid-feedback">{{ translate('systems.songs.error.isEmpty') }}</div>
              </div>
            </b-col>
            <b-col cols="6">
              <label>{{ translate('systems.songs.endTime') }}</label>
              <div class="input-group">
                <input v-model="data.item.endTime" type="number" class="form-control" :min="Number(data.item.startTime) + 1" :max="data.item.length">
                <div class="input-group-append">
                  <div class="input-group-text">{{translate('systems.songs.seconds')}}</div>
                </div>
                <div class="invalid-feedback">{{ translate('systems.songs.error.isEmpty') }}</div>
              </div>
            </b-col>
          </b-row>
          <b-row class="form-group">
            <b-col cols="12">
              <label>{{ translate('systems.songs.tags') }}</label>
              <div class="input-group">
                <tags v-model="data.item.tags" ifEmptyTag="general" class="w-100"/>
              </div>
            </b-col>
          </b-row>
          <div class="form-group text-right col-md-12">
            <button type="button" class="btn btn-secondary" @click="data.toggleDetails">{{translate('events.dialog.close')}}</button>

            <button v-if="state.save === 0" type="button" class="btn btn-primary" v-on:click="updateItem(data.item.videoId)">{{ translate('dialog.buttons.saveChanges.idle') }}</button>
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
import translate from 'src/panel/helpers/translate';

import { Vue, Component, Watch } from 'vue-property-decorator';
import { SongPlaylistInterface } from 'src/bot/database/entity/song';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import { error } from 'src/panel/helpers/error';
library.add(faStepBackward, faStepForward);

let lastVariant = -1;
let labelToVariant = new Map<string, string>();

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    tags: () => import('../../../components/tags.vue'),
  },
  filters: {
    formatTime(seconds: number) {
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
  translate = translate;
  socket = getSocket('/systems/songs');

  items: SongPlaylistInterface[] = [];
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
  showTag: string | null = null; // null === all
  currentTag: string = 'general';
  tags: string[] = []

  fields = [
    { key: 'thumbnail', label: '', tdClass: 'fitThumbnail' },
    { key: 'title', label: '' },
    { key: 'buttons', label: '' },
  ];

  currentPage = 1;
  perPage = 25;
  count: number = 0;

  get fItems() {
    return this.items;
  }

  @Watch('showTag')
  goToFirstPage = () => {
    this.currentPage = 1;
    this.refreshPlaylist()
  };

  created() {
    this.refreshPlaylist()
  }

  @Watch('currentPage')
  @Watch('search')
  async refreshPlaylist() {
    await Promise.all([
      new Promise((resolve, reject) => {
        this.socket.emit('current.playlist.tag', (err: string | null, tag: string) => {
          if (err) {
            error(err)
            reject(err);
          }
          this.currentTag = tag;
          resolve();
        })
      }),
      new Promise((resolve, reject) => {
        this.socket.emit('get.playlist.tags', (err: string | null, tags: string[]) => {
          if (err) {
            error(err)
            reject(err);
          }
          console.log([...tags]);
          this.tags = [...tags];
          resolve();
        })
      }),
      new Promise((resolve, reject) => {
        this.socket.emit('find.playlist', { page: (this.currentPage - 1), search: this.search, tag: this.showTag }, (err: string | null, items: SongPlaylistInterface[], count: number) => {
          if (err) {
            error(err)
            reject(err);
          }
          for (let item of items) {
            item.startTime = item.startTime ? item.startTime : 0
            item.endTime = item.endTime ? item.endTime : item.length
          }
          this.count = count;
          this.items = items;
          resolve();
        })
      }),
    ]);
    this.state.loading = this.$state.success;
    if (this.showTag && !this.tags.includes(this.showTag)) {
      this.showTag = null;
    }
  }

  generateThumbnail(videoId: string) {
    return `https://img.youtube.com/vi/${videoId}/1.jpg`
  }

  stopImport() {
    if (this.state.import === 1) {
      this.state.import = 0
      this.socket.emit('stop.import', () => {
        this.refreshPlaylist()
      })
    }
  }

  addSongOrPlaylist(evt: Event) {
    if (evt) {
      evt.preventDefault()
    }
    if (this.state.import === 0) {
      this.state.import = 1
      this.socket.emit(this.toAdd.includes('playlist') ? 'import.playlist' : 'import.video', { playlist: this.toAdd, forcedTag: this.showTag }, (err: string | null, info: (CommandResponse & { imported: number; skipped: number })[]) => {
        if (err) {
          this.state.import = 3
          setTimeout(() => {
            this.importInfo = ''
            this.state.import = 0
          }, 2000)
        } else {
          this.state.import = 2
          this.refreshPlaylist()
          this.toAdd = ''
          this.showImportInfo(info[0])
        }
      })
    }
  }

  showImportInfo(info: { imported: number; skipped: number }) {
    this.importInfo = `Imported: ${info.imported}, Skipped: ${info.skipped}`
    setTimeout(() => {
      this.importInfo = ''
      this.state.import = 0
    }, 2000)
  }

  getVariant(type: string) {
    const variants = [ "primary", "secondary", "success", "danger", "warning", "info", "light", "dark" ]
    if (labelToVariant.has(type)) {
      return labelToVariant.get(type);
    } else {
      if (lastVariant === -1 || lastVariant === variants.length - 1) {
        lastVariant = 0;
      }
      labelToVariant.set(type, variants[lastVariant]);
      lastVariant++
      return labelToVariant.get(type);
    }
  }

  updateItem(videoId: string) {
    this.state.save = 1

    let item = this.items.find((o) => o.videoId === videoId)
    if (item) {
      item.volume = Number(item.volume)
      item.startTime = Number(item.startTime)
      item.endTime = Number(item.endTime)
      this.socket.emit('songs::save', item, (err: string | null) => {
        if (err) {
          console.error(err)
          return this.state.save = 3
        }
        this.state.save = 2
        this.refreshPlaylist();
        setTimeout(() => {
          this.state.save = 0
        }, 1000)
      })
    }
  }

  deleteItem(id: string) {
    if (confirm('Do you want to delete song ' + this.items.find(o => o.videoId === id)?.title + '?')) {
      this.socket.emit('delete.ban', id, () => {
        this.items = this.items.filter((o) => o.videoId !== id)
      })
    }
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
