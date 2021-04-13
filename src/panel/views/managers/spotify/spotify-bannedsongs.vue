<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.spotify') }}
          {{ translate('menu.bannedsongs') }}
        </span>
      </b-col>
      <b-col
        v-if="!$integrations.find(o => o.name === 'spotify').enabled"
        style=" text-align: right;"
      >
        <b-alert
          show
          variant="danger"
          style="padding: .5rem; margin: 0; display: inline-block;"
        >
          <fa
            icon="exclamation-circle"
            fixed-width
          /> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel
      search
      @search="search = $event"
    >
      <template #left>
        <b-form
          inline
          @submit="addSongOrPlaylist"
        >
          <b-input-group>
            <b-input
              v-model="toAdd"
              input
              type="text"
              class="form-control w-auto col-6"
              placeholder="Paste your spotifyUri"
            />
            <b-input-group-append>
              <b-button
                v-if="state.import == 0"
                type="submit"
                variant="primary"
                class="btn mr-2"
                @click="addSongOrPlaylist()"
              >
                <fa icon="plus" /> {{ translate('systems.songs.add_song') }}
              </b-button>
              <b-button
                v-else-if="state.import == 1"
                class="btn mr-2"
                variant="info"
                disabled="disabled"
              >
                <fa
                  icon="circle-notch"
                  spin
                /> {{ translate('systems.songs.importing') }}
              </b-button>
              <b-button
                v-else
                class="btn mr-2"
                variant="success"
                disabled="disabled"
              >
                <fa icon="check" /> {{ translate('systems.songs.importing_done') }}
              </b-button>
            </b-input-group-append>
          </b-input-group>
        </b-form>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success" />
    <template v-else>
      <b-alert
        v-if="fItems.length === 0 && search.length > 0"
        show
        variant="danger"
      >
        <fa icon="search" /> <span v-html="translate('systems.songs.bannedSongsEmptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="items.length === 0"
        show
      >
        {{ translate('systems.songs.bannedSongsEmpty') }}
      </b-alert>
      <b-table
        v-else
        striped
        small
        :items="fItems"
        :fields="fields"
        class="table-p-0"
      >
        <template #cell(title)="data">
          {{ data.item.title }}
        </template>
        <template #cell(artists)="data">
          {{ data.item.artists.join(', ') }}
        </template>
        <template #cell(buttons)="data">
          <div
            class="float-right pr-2"
            style="width: max-content !important;"
          >
            <button-with-icon
              class="btn-only-icon btn-danger btn-reverse"
              icon="trash"
              @click="deleteItem(data.item.spotifyUri)"
            >
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">

import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, ref,
} from '@vue/composition-api';
import { escapeRegExp, isNil } from 'lodash-es';

import { SpotifySongBanInterface } from 'src/bot/database/entity/spotify';
import { ButtonStates } from 'src/panel/helpers/buttonStates';

const socket = getSocket('/integrations/spotify');

export default defineComponent({
  components: { loading: () => import('../../../components/loading.vue') },
  setup() {
    const items = ref([] as SpotifySongBanInterface[]);

    const search = ref('');
    const toAdd = ref('');
    const state = ref({
      loading: ButtonStates.progress,
      import:  ButtonStates.idle,
    } as {
      loading: number;
      import: number;
    });

    const fields = [
      { key: 'title', label: '' },
      { key: 'artists', label: '' },
      { key: 'buttons', label: '' },
    ];

    const fItems = computed (() => {
      if (search.value.length === 0) {
        return items.value;
      }
      return items.value.filter((o) => {
        const isSearchInTitle = !isNil(o.title.match(new RegExp(escapeRegExp(search.value), 'ig')));
        return isSearchInTitle;
      });
    });

    onMounted(() => {
      refreshBanlist();
    });

    const refreshBanlist = () => {
      state.value.loading = ButtonStates.progress;
      socket.emit('spotify::getAllBanned', {}, (err: string | null, _items: SpotifySongBanInterface[]) => {
        items.value = _items;
        state.value.loading = ButtonStates.success;
      });
    };

    const deleteItem = (id: string)  => {
      if (confirm('Do you want to delete ' + items.value.find((o) => o.spotifyUri === id)?.title + '?')) {
        socket.emit('spotify::deleteBan', { spotifyUri: id }, () => {
          items.value = items.value.filter((o) => o.spotifyUri !== id);
        });
      }
    };

    const addSongOrPlaylist = (evt: Event) => {
      if (evt) {
        evt.preventDefault();
      }
      if (state.value.import === 0) {
        state.value.import = 1;
        socket.emit('spotify::addBan', toAdd.value, (err: string | null, info: { banned: number }) => {
          state.value.import = 2;
          refreshBanlist();
          setTimeout(() => {
            state.value.import = 0;
          }, 5000);
        });
      }
    };

    return {
      items,
      search,
      toAdd,
      state,
      fields,
      fItems,
      deleteItem,
      addSongOrPlaylist,

      translate,
    };
  },
});
</script>

<style>
.table-p-0 td {
  vertical-align: middle;
  padding: 1rem 0;
}
</style>
