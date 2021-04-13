<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.bannedsongs') }}
        </span>
      </b-col>
      <b-col
        v-if="!$systems.find(o => o.name === 'songs').enabled"
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
          @submit="addSong"
        >
          <b-input-group>
            <b-input
              v-model="toAdd"
              input
              type="text"
              class="form-control w-auto col-6"
              placeholder="Paste your youtube link, id"
            />
            <b-input-group-append>
              <b-button
                v-if="state.import == 0"
                type="submit"
                variant="primary"
                class="btn mr-2"
                @click="addSong()"
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
          <div class="text-info">
            {{ importInfo }}
          </div>
        </b-form>
      </template>
    </panel>

    <loading v-if="state.loading !== ButtonStates.success" />
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
        <template #cell(thumbnail)="data">
          <img
            class="float-left pr-3"
            :src="generateThumbnail(data.item.videoId)"
          >
        </template>
        <template #cell(title)="data">
          {{ data.item.title }}
        </template>
        <template #cell(buttons)="data">
          <div
            class="float-right pr-2"
            style="width: max-content !important;"
          >
            <button-with-icon
              class="btn-only-icon btn-secondary btn-reverse"
              icon="link"
              :href="'http://youtu.be/' + data.item.videoId"
            />
            <button-with-icon
              class="btn-only-icon btn-danger btn-reverse"
              icon="trash"
              @click="deleteItem(data.item.videoId)"
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

import { SongBanInterface } from 'src/bot/database/entity/song';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';

const socket = getSocket('/systems/songs');

export default defineComponent({
  components: { 'loading': () => import('src/panel/components/loading.vue') },
  setup() {
    const items = ref([] as SongBanInterface[]);
    const search = ref('');
    const toAdd = ref('');
    const importInfo = ref('');

    const state = ref({
      loading: ButtonStates.progress,
      import:  ButtonStates.idle,
    } as {
      loading: number;
      import: number;
    });

    const fields = [
      {
        key: 'thumbnail', label: '', tdClass: 'fitThumbnail',
      },
      { key: 'title', label: '' },
      { key: 'buttons', label: '' },
    ];

    const fItems = computed(() => {
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
      socket.emit('songs::getAllBanned', {}, (err: string | null, getAllBanned: SongBanInterface[]) => {
        items.value = getAllBanned;
        state.value.loading = ButtonStates.success;
      });
    };

    const generateThumbnail = (videoId: string) => {
      return `https://img.youtube.com/vi/${videoId}/1.jpg`;
    };

    const deleteItem = (id: string) => {
      if (confirm('Do you want to delete banned song ' + items.value.find(o => o.videoId === id)?.title + '?')) {
        socket.emit('delete.ban', id, () => {
          items.value = items.value.filter((o) => o.videoId !== id);
        });
      }
    };

    const showImportInfo = async () => {
      importInfo.value = 'BANNED!';
      setTimeout(() => {
        importInfo.value = '';
        state.value.import = 0;
      }, 5000);
    };

    const addSong = (evt: Event) => {
      if (evt) {
        evt.preventDefault();
      }
      if (state.value.import === 0) {
        state.value.import = 1;
        socket.emit('import.ban', toAdd.value, (err: string | null, info: CommandResponse[]) => {
          if (err) {
            toAdd.value = '';
            importInfo.value = '';
            state.value.import = 0;
            return error(err);
          }
          state.value.import = 2;
          refreshBanlist();
          toAdd.value = '';
          showImportInfo();
        });
      }
    };

    const linkTo = (item: SongBanInterface) => {
      console.debug('Clicked', item.videoId);
      window.location.href = `http://youtu.be/${item.videoId}`;
    };

    return {
      items,
      fItems,
      fields,
      state,
      search,
      importInfo,
      toAdd,

      generateThumbnail,
      deleteItem,
      showImportInfo,
      addSong,
      linkTo,

      translate,
      ButtonStates,
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
