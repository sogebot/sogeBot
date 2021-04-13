<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.playlist') }}
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
      <template #right>
        <b-select
          v-model="showTag"
          class="mr-2"
        >
          <b-form-select-option :value="null">
            All playlists
          </b-form-select-option>
          <b-form-select-option
            v-for="tag of tags"
            :key="tag"
            :value="tag"
          >
            {{ tag }}
            <template v-if="currentTag === tag">
              (current)
            </template>
          </b-form-select-option>
        </b-select>

        <b-pagination
          v-model="currentPage"
          class="m-0"
          :total-rows="count"
          :per-page="perPage"
          aria-controls="my-table"
        />
      </template>
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
              placeholder="Paste your youtube link, id or playlist link"
            />
            <b-input-group-append>
              <b-button
                v-if="state.import == 0"
                type="submit"
                variant="primary"
                class="btn mr-2"
                @click="addSongOrPlaylist()"
              >
                <fa icon="plus" /> {{ translate('systems.songs.add_or_import') }}
              </b-button>
              <b-button-group v-else-if="state.import == 1">
                <b-button
                  class="btn"
                  variant="info"
                  disabled="disabled"
                >
                  <fa
                    icon="circle-notch"
                    spin
                    fixed-width
                  /> {{ translate('systems.songs.importing') }}
                </b-button>
                <b-button
                  variant="danger"
                  @click="stopImport()"
                >
                  <fa
                    icon="stop"
                    fixed-width
                  />
                </b-button>
              </b-button-group>
              <b-button
                v-else-if="state.import == 2"
                class="btn mr-2"
                variant="success"
                disabled="disabled"
              >
                <fa icon="check" /> {{ translate('systems.songs.importing_done') }}
              </b-button>
              <b-button
                v-else
                class="btn mr-2"
                variant="danger"
                disabled="disabled"
              >
                <fa icon="times" /> {{ translate('dialog.buttons.something-went-wrong') }}
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
        <fa icon="search" /> <span v-html="translate('systems.songs.emptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="items.length === 0"
        show
      >
        {{ translate('systems.songs.empty') }}
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
          <div>
            {{ data.item.title }}
            <b-badge
              v-for="tag of data.item.tags"
              :key="tag"
              class="mr-1"
              :variant="getVariant(tag)"
            >
              {{ tag }}
            </b-badge>
          </div>
          <small class="d-block">
            <fa :icon="[ 'far', 'clock' ]" /> {{ data.item.length | formatTime }}
            <fa
              class="ml-3"
              :icon="['fas', 'volume-up']"
            /> {{ Number(data.item.volume).toFixed(1) }}%
            <fa
              class="ml-3"
              :icon="['fas', 'step-backward']"
            />
            {{ data.item.startTime | formatTime }} - {{ data.item.endTime | formatTime }}
            <fa icon="step-forward" />
            <fa
              class="ml-3"
              :icon="['fas', 'music']"
            /> {{ new Date(data.item.lastPlayedAt).toLocaleString() }}
          </small>
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
              class="btn-only-icon btn-primary btn-reverse"
              icon="edit"
              @click="data.toggleDetails"
            >
              {{ translate('dialog.buttons.edit') }}
            </button-with-icon>
            <button-with-icon
              class="btn-only-icon btn-danger btn-reverse"
              icon="trash"
              @click="deleteItem(data.item.videoId)"
            >
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
        <template #row-details="data">
          <b-card>
            <b-row class="form-group">
              <b-col cols="12">
                <label>{{ translate('systems.songs.settings.volume') }}</label>
                <div class="input-group">
                  <button
                    class="btn"
                    :class="[!data.item.forceVolume ? ' btn-success' : 'btn-secondary']"
                    @click="data.item.forceVolume = false"
                  >
                    {{ translate('systems.songs.calculated') }}
                  </button>
                  <button
                    class="btn"
                    :class="[data.item.forceVolume ? ' btn-success' : 'btn-secondary']"
                    @click="data.item.forceVolume = true"
                  >
                    {{ translate('systems.songs.set_manually') }}
                  </button>
                  <input
                    v-model="data.item.volume"
                    type="number"
                    class="form-control"
                    min="1"
                    max="100"
                    :disabled="!data.item.forceVolume"
                  >
                  <div class="input-group-append">
                    <div class="input-group-text">
                      %
                    </div>
                  </div>
                  <div class="invalid-feedback">
                    {{ translate('systems.songs.error.isEmpty') }}
                  </div>
                </div>
              </b-col>
            </b-row>
            <b-row class="form-group">
              <b-col cols="6">
                <label>{{ translate('systems.songs.startTime') }}</label>
                <div class="input-group">
                  <input
                    v-model="data.item.startTime"
                    type="number"
                    class="form-control"
                    min="1"
                    :max="Number(data.item.endTime) - 1"
                  >
                  <div class="input-group-append">
                    <div class="input-group-text">
                      {{ translate('systems.songs.seconds') }}
                    </div>
                  </div>
                  <div class="invalid-feedback">
                    {{ translate('systems.songs.error.isEmpty') }}
                  </div>
                </div>
              </b-col>
              <b-col cols="6">
                <label>{{ translate('systems.songs.endTime') }}</label>
                <div class="input-group">
                  <input
                    v-model="data.item.endTime"
                    type="number"
                    class="form-control"
                    :min="Number(data.item.startTime) + 1"
                    :max="data.item.length"
                  >
                  <div class="input-group-append">
                    <div class="input-group-text">
                      {{ translate('systems.songs.seconds') }}
                    </div>
                  </div>
                  <div class="invalid-feedback">
                    {{ translate('systems.songs.error.isEmpty') }}
                  </div>
                </div>
              </b-col>
            </b-row>
            <b-row class="form-group">
              <b-col cols="12">
                <label>{{ translate('tags') }}</label>
                <div class="input-group">
                  <tags
                    v-model="data.item.tags"
                    if-empty-tag="general"
                    class="w-100"
                  />
                </div>
              </b-col>
            </b-row>
            <div class="form-group text-right col-md-12">
              <button
                type="button"
                class="btn btn-secondary"
                @click="data.toggleDetails"
              >
                {{ translate('events.dialog.close') }}
              </button>

              <button
                v-if="state.save === 0"
                type="button"
                class="btn btn-primary"
                @click="updateItem(data.item.videoId)"
              >
                {{ translate('dialog.buttons.saveChanges.idle') }}
              </button>
              <button
                v-if="state.save === 1"
                disabled="disabled"
                type="button"
                class="btn btn-primary"
              >
                <fa
                  icon="circle-notch"
                  spin
                /> {{ translate('dialog.buttons.saveChanges.progress') }}
              </button>
              <button
                v-if="state.save === 2"
                disabled="disabled"
                type="button"
                class="btn btn-success"
              >
                <fa icon="check" /> {{ translate('dialog.buttons.saveChanges.done') }}
              </button>
              <button
                v-if="state.save === 3"
                disabled="disabled"
                type="button"
                class="btn btn-danger"
              >
                <fa icon="exclamation" /> {{ translate('dialog.buttons.something-went-wrong') }}
              </button>
            </div>
          </b-card>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">

import { library } from '@fortawesome/fontawesome-svg-core';
import { faStepBackward, faStepForward } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';

import { SongPlaylistInterface } from 'src/bot/database/entity/song';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';

library.add(faStepBackward, faStepForward);

let lastVariant = -1;
const labelToVariant = new Map<string, string>();
const socket = getSocket('/systems/songs');

export default defineComponent({
  components: {
    loading: () => import('../../../components/loading.vue'),
    tags:    () => import('../../../components/tags.vue'),
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
    },
  },
  setup() {
    const items = ref([] as SongPlaylistInterface[]);
    const search = ref('');
    const toAdd = ref('');
    const importInfo = ref('');

    const state = ref({
      loading: ButtonStates.progress,
      import:  ButtonStates.idle,
      save:    ButtonStates.idle,
    } as {
      loading: number;
      import: number;
      save: number;
    });
    const showTag = ref(null as string | null); // null === all
    const currentTag = ref('general');
    const tags = ref([] as string[]);

    const fields = [
      {
        key: 'thumbnail', label: '', tdClass: 'fitThumbnail',
      },
      { key: 'title', label: '' },
      { key: 'buttons', label: '' },
    ];

    const currentPage = ref(1);
    const perPage = ref(25);
    const count = ref(0);

    const fItems = computed(() => items.value);

    onMounted(() => {
      refreshPlaylist();
    });

    watch(showTag, () => {
      currentPage.value = 1;
      refreshPlaylist();
    });

    watch([currentPage, search], () => {
      refreshPlaylist();
    });

    const refreshPlaylist = async () => {
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          socket.emit('current.playlist.tag', (err: string | null, tag: string) => {
            if (err) {
              error(err);
              reject(err);
            }
            currentTag.value = tag;
            resolve();
          });
        }),
        new Promise<void>((resolve, reject) => {
          socket.emit('get.playlist.tags', (err: string | null, _tags: string[]) => {
            if (err) {
              error(err);
              reject(err);
            }
            tags.value = [..._tags];
            resolve();
          });
        }),
        new Promise<void>((resolve, reject) => {
          socket.emit('find.playlist', {
            page: (currentPage.value - 1), search: search.value, tag: showTag.value,
          }, (err: string | null, _items: SongPlaylistInterface[], _count: number) => {
            if (err) {
              error(err);
              reject(err);
            }
            for (const item of _items) {
              item.startTime = item.startTime ? item.startTime : 0;
              item.endTime = item.endTime ? item.endTime : item.length;
            }
            count.value = _count;
            items.value = _items;
            resolve();
          });
        }),
      ]);
      state.value.loading = ButtonStates.success;
      if (showTag.value && !tags.value.includes(showTag.value)) {
        showTag.value = null;
      }
    };

    const generateThumbnail = (videoId: string) => {
      return `https://img.youtube.com/vi/${videoId}/1.jpg`;
    };

    const stopImport = () => {
      if (state.value.import === 1) {
        state.value.import = 0;
        socket.emit('stop.import', () => {
          refreshPlaylist();
        });
      }
    };

    const addSongOrPlaylist = (evt: Event) => {
      if (evt) {
        evt.preventDefault();
      }
      if (state.value.import === 0) {
        state.value.import = 1;
        socket.emit(toAdd.value.includes('playlist') ? 'import.playlist' : 'import.video', { playlist: toAdd.value, forcedTag: showTag.value }, (err: string | null, info: (CommandResponse)[]) => {
          if (err) {
            state.value.import = 3;
            setTimeout(() => {
              importInfo.value = '';
              state.value.import = 0;
            }, 2000);
          } else {
            state.value.import = 2;
            refreshPlaylist();
            toAdd.value = '';
            showImportInfo();
          }
        });
      }
    };

    const showImportInfo = async () => {
      importInfo.value = 'OK';
      setTimeout(() => {
        importInfo.value = '';
        state.value.import = 0;
      }, 2000);
    };

    const getVariant = (type: string) => {
      const variants = [ 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark' ];
      if (labelToVariant.has(type)) {
        return labelToVariant.get(type);
      } else {
        if (lastVariant === -1 || lastVariant === variants.length - 1) {
          lastVariant = 0;
        }
        labelToVariant.set(type, variants[lastVariant]);
        lastVariant++;
        return labelToVariant.get(type);
      }
    };

    const updateItem = (videoId: string) => {
      state.value.save = 1;

      const item = items.value.find((o) => o.videoId === videoId);
      if (item) {
        item.volume = Number(item.volume);
        item.startTime = Number(item.startTime);
        item.endTime = Number(item.endTime);
        socket.emit('songs::save', item, (err: string | null) => {
          if (err) {
            console.error(err);
            return state.value.save = 3;
          }
          state.value.save = 2;
          refreshPlaylist();
          setTimeout(() => {
            state.value.save = 0;
          }, 1000);
        });
      }
    };

    const deleteItem = (id: string) => {
      if (confirm('Do you want to delete song ' + items.value.find(o => o.videoId === id)?.title + '?')) {
        socket.emit('delete.playlist', id, () => {
          items.value = items.value.filter((o) => o.videoId !== id);
        });
      }
    };

    return {
      items,
      fItems,
      search,
      toAdd,
      importInfo,
      state,
      showTag,
      currentTag,
      tags,
      fields,
      currentPage,
      perPage,
      count,

      generateThumbnail,
      stopImport,
      addSongOrPlaylist,
      getVariant,
      updateItem,
      deleteItem,

      ButtonStates,
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
