<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.spotify') }}
          {{ translate('menu.bannedsongs') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'songs').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <b-form inline @submit="addSongOrPlaylist">
          <b-input-group>
            <b-input input type="text" class="form-control w-auto col-6" v-model="toAdd" placeholder="Paste your spotifyUri" />
            <b-input-group-append>
              <b-button type="submit" v-if="state.import == 0" variant="primary" class="btn mr-2" v-on:click="addSongOrPlaylist()">
                <fa icon="plus"></fa> {{ translate('systems.songs.add_song') }}</b-button>
              <b-button v-else-if="state.import == 1" class="btn mr-2" variant="info" disabled="disabled">
                <fa icon="circle-notch" spin></fa> {{ translate('systems.songs.importing') }}</b-button>
              <b-button v-else class="btn mr-2" variant="success" disabled="disabled">
                <fa icon="check"></fa> {{ translate('systems.songs.importing_done') }}</b-button>
            </b-input-group-append>
          </b-input-group>
        </b-form>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-table v-else striped small :items="fItems" :fields="fields" class="table-p-0">
      <template v-slot:cell(title)="data">
        {{ data.item.title }}
      </template>
      <template v-slot:cell(artists)="data">
        {{ data.item.artists.join(', ') }}
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="float-right pr-2" style="width: max-content !important;">
          </button-with-icon>
          <hold-button @trigger="deleteItem(data.item.spotifyUri)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
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
import { SpotifySongBanInterface } from 'src/bot/database/entity/spotify';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  }
})
export default class playlist extends Vue {
  socket = getSocket('/integrations/spotify');

  items: SpotifySongBanInterface[] = [];
  search: string = '';
  toAdd: string = '';
  state: {
    loading: number;
    import: number;
  } = {
    loading: this.$state.progress,
    import: this.$state.idle,
  }

  fields = [
    { key: 'title', label: '' },
    { key: 'artists', label: '' },
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
    this.socket.emit('spotify::getAllBanned', {}, (err: string | null, items: SpotifySongBanInterface[]) => {
      this.items = items
      this.state.loading = this.$state.success;
    })
  }

  deleteItem(id: string) {
    this.socket.emit('spotify::deleteBan', { spotifyUri: id }, () => {
      this.items = this.items.filter((o) => o.spotifyUri !== id)
    })
  }

  addSongOrPlaylist(evt: Event) {
    if (evt) {
      evt.preventDefault()
    }
    if (this.state.import === 0) {
      this.state.import = 1
      this.socket.emit('spotify::addBan', this.toAdd, (err: string | null, info: { banned: number }) => {
        this.state.import = 2
        this.refreshBanlist()
        setTimeout(() => {
          this.state.import = 0
        }, 5000)
      })
    }
  }
}
</script>

<style>
.table-p-0 td {
  vertical-align: middle;
  padding: 1rem 0;
}
</style>
