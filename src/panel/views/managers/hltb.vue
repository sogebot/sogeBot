<template>
  <div
    ref="window"
    class="container-fluid"
  >
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.howlongtobeat') }}
        </span>
      </b-col>
      <b-col
        v-if="!$systems.find(o => o.name === 'howlongtobeat').enabled"
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
        <div style="min-width: 300px">
          <search
            :placeholder="translate('systems.howlongtobeat.searchToAddNewGame')"
            :options="searchForGameOpts"
            :value="[gameToAdd]"
            @search="searchForGame($event);"
            @input="gameToAdd = $event"
          />
        </div>
      </template>
    </panel>
    <loading v-if="state.loading !== $state.success" />
    <template v-else>
      <b-alert
        v-if="fItems.length === 0 && search.length > 0"
        show
        variant="danger"
      >
        <fa icon="search" /> <span v-html="translate('systems.howlongtobeat.emptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="items.length === 0"
        show
      >
        {{ translate('systems.howlongtobeat.empty') }}
      </b-alert>
      <b-table
        v-else
        striped
        small
        :items="fItems"
        :fields="fields"
      >
        <template #row-details="data">
          <b-card>
            <template v-for="stream of streams.filter(o => o.hltb_id === data.item.id)">
              <b-row :key="stream.id + '1'">
                <b-col><b>{{ translate('systems.howlongtobeat.when') }}</b></b-col>
                <b-col><b>{{ translate('systems.howlongtobeat.time') }}</b></b-col>
                <b-col />
                <b-col><b>{{ translate('systems.howlongtobeat.offset') }}</b></b-col>
              </b-row>
              <b-row :key="stream.id + '2'">
                <b-col>{{ (new Date(stream.createdAt)).toLocaleString() }}</b-col>
                <b-col>{{ timeToReadable(timestampToObject(stream.timestamp)) }}</b-col>
                <b-col>
                  <b-button
                    :pressed.sync="stream.isMainCounted"
                    variant="outline-success"
                  >
                    {{ translate('systems.howlongtobeat.main') }}
                  </b-button>
                  <b-button
                    :pressed.sync="stream.isExtraCounted"
                    variant="outline-success"
                  >
                    {{ translate('systems.howlongtobeat.extra') }}
                  </b-button>
                  <b-button
                    :pressed.sync="stream.isCompletionistCounted"
                    variant="outline-success"
                  >
                    {{ translate('systems.howlongtobeat.completionist') }}
                  </b-button>
                </b-col>
                <b-col>
                  <b-input-group>
                    <b-form-spinbutton
                      v-model="stream.offset"
                      inline
                      step="10000"
                      :formatter-fn="minutesFormatter"
                      :min="-stream.timestamp"
                      :max="Number.MAX_SAFE_INTEGER"
                      repeat-step-multiplier="50"
                    />
                    <b-button
                      variant="dark"
                      @click="stream.offset = 0"
                    >
                      <fa
                        icon="redo"
                        fixed-width
                      />
                    </b-button>
                  </b-input-group>
                </b-col>
              </b-row>
            </template>
          </b-card>
        </template>
        <template #cell(thumbnail)="data">
          <b-img
            thumbnail
            width="70"
            height="70"
            :src="'https://howlongtobeat.com' + data.item.imageUrl"
            :alt="data.item.game + ' thumbnail'"
          />
        </template>
        <template #cell(startedAt)="data">
          {{ (new Date(data.item.startedAt)).toLocaleString() }}
        </template>
        <template #cell(main)="data">
          {{ timeToReadable(timestampToObject(getStreamsTimestamp(data.item.id, 'main') + +data.item.offset + getStreamsOffset(data.item.id, 'main'))) }} <span v-if="data.item.gameplayMain">/ {{ timeToReadable(timestampToObject(data.item.gameplayMain * 3600000)) }}</span>
        </template>
        <template #cell(extra)="data">
          {{ timeToReadable(timestampToObject(getStreamsTimestamp(data.item.id, 'extra') + +data.item.offset + getStreamsOffset(data.item.id, 'extra'))) }} <span v-if="data.item.gameplayMain">/ {{ timeToReadable(timestampToObject(data.item.gameplayMainExtra * 3600000)) }}</span>
        </template>
        <template #cell(completionist)="data">
          {{ timeToReadable(timestampToObject(getStreamsTimestamp(data.item.id, 'completionist') + +data.item.offset + getStreamsOffset(data.item.id, 'completionist'))) }} <span v-if="data.item.gameplayMain">/ {{ timeToReadable(timestampToObject(data.item.gameplayCompletionist * 3600000)) }}</span>
        </template>
        <template #cell(offset)="data">
          <b-input-group>
            <b-form-spinbutton
              v-model="data.item.offset"
              inline
              step="10000"
              :formatter-fn="minutesFormatter"
              :min="0"
              :max="Number.MAX_SAFE_INTEGER"
              repeat-step-multiplier="50"
            />
            <b-button
              variant="dark"
              @click="data.item.offset = 0"
            >
              <fa
                icon="redo"
                fixed-width
              />
            </b-button>
          </b-input-group>
        </template>
        <template #cell(buttons)="data">
          <div
            class="float-right"
            style="width: max-content !important;"
          >
            <b-button
              :variant="data.detailsShowing ? 'primary' : 'outline-primary'"
              @click="data.toggleDetails"
            >
              {{
                (data.detailsShowing
                  ? translate('systems.howlongtobeat.hideHistory')
                  : translate('systems.howlongtobeat.showHistory'))
                  .replace('$count', streams.filter(o => o.hltb_id === data.item.id).length)
              }}
            </b-button>
            <button-with-icon
              class="btn-only-icon btn-danger btn-reverse"
              icon="trash"
              @click="del(data.item.id)"
            >
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
      </b-table>
    </template>
  </div>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faRedo } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';
import { cloneDeep, debounce } from 'lodash-es';

import { HowLongToBeatGameInterface, HowLongToBeatGameItemInterface } from 'src/bot/database/entity/howLongToBeatGame';
import { getTime, timestampToObject } from 'src/bot/helpers/getTime';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';

library.add(faRedo);

const socket = getSocket('/systems/howlongtobeat');

export default defineComponent({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
    search:    () => import('src/panel/components/searchDropdown.vue'),
    panel:     () => import('../../components/panel.vue'),
  },
  setup(props, ctx) {
    const items = ref([] as HowLongToBeatGameInterface[]);
    const oldItems = ref([] as HowLongToBeatGameInterface[]);
    const streams = ref([] as HowLongToBeatGameItemInterface[]);
    const oldStreams = ref([] as HowLongToBeatGameItemInterface[]);
    const searchForGameOpts = ref([] as string[]);
    const gameToAdd = ref('');
    const state = ref({ loading: ButtonStates.progress } as {
      loading: number;
    });
    const search = ref('');

    const getStreamsOffset = (hltb_id: string, type: 'extra' | 'main' | 'completionist') => {
      return streams.value
        .filter(o => o.hltb_id === hltb_id && ((type === 'main' && o.isMainCounted) || (type === 'completionist' && o.isCompletionistCounted) || (type === 'extra' && o.isExtraCounted)))
        .reduce((a,b) => a + b.offset, 0);
    };

    const getStreamsTimestamp = (hltb_id: string, type: 'extra' | 'main' | 'completionist') => {
      return streams.value
        .filter(o => o.hltb_id === hltb_id && ((type === 'main' && o.isMainCounted) || (type === 'completionist' && o.isCompletionistCounted) || (type === 'extra' && o.isExtraCounted)))
        .reduce((a,b) => a + b.timestamp, 0);
    };

    const fItems = computed(() => {
      return items.value
        .filter((o) => {
          if (search.value.trim() === '') {
            return true;
          }
          return o.game.trim().toLowerCase().includes(search.value.trim().toLowerCase());
        })
        .sort((a, b) => {
          const A = a.game.toLowerCase();
          const B = b.game.toLowerCase();
          if (A < B)  { //sort string ascending
            return -1;
          }
          if (A > B) {
            return 1;
          }
          return 0; //default return value (no sorting)
        });
    });

    const fields = [
      { key: 'thumbnail', label: '' },
      {
        key: 'game', label: translate('systems.howlongtobeat.game'), sortable: true,
      },
      {
        key: 'startedAt', label: translate('systems.howlongtobeat.startedAt'), sortable: true,
      },
      { key: 'main', label: translate('systems.howlongtobeat.main') },
      { key: 'extra', label: translate('systems.howlongtobeat.extra') },
      { key: 'completionist', label: translate('systems.howlongtobeat.completionist') },
      { key: 'offset', label: translate('systems.howlongtobeat.offset') },
      { key: 'buttons', label: '' },
    ];

    onMounted(() => {
      refresh();
    });
    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, _games: HowLongToBeatGameInterface[], _streams: HowLongToBeatGameItemInterface[]) => {
        if (err) {
          return error(err);
        }
        items.value = cloneDeep(_games);
        oldItems.value = cloneDeep(_games);
        streams.value = cloneDeep(_streams);
        oldStreams.value = cloneDeep(_streams);
        state.value.loading = ButtonStates.success;
      });
    };

    const timeToReadable = (data: { days: number; hours: number; minutes: number; seconds: number}) => {
      const output = [];
      if (data.days) {
        output.push(`${data.days}d`);
      }
      if (data.hours) {
        output.push(`${data.hours}h`);
      }
      if (data.minutes) {
        output.push(`${data.minutes}m`);
      }
      if (data.seconds || output.length === 0) {
        output.push(`${data.seconds}s`);
      }
      return output.join(' ');
    };
    const minutesFormatter = (value: number) => {
      return (value < 0 ? '- ' : '+ ') + timeToReadable(timestampToObject(Math.abs(value)));
    };

    const del = (id: string) => {
      if (confirm('Do you want to delete tracked game ' + items.value.find(o => o.id === id)?.game + '?')) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        });
      }
    };

    watch(items, (val) => {
      for (const game of val) {
        // find stream and check if changed
        const oldGame = oldItems.value.find(o => o.id === game.id);
        if (oldGame
          && (oldGame.offset !== game.offset)) {
          socket.emit('hltb::save', game, (err: string | null) => {
            if (err) {
              error(err);
            }
          });
        }
      }
      oldItems.value = cloneDeep(items.value);
    }, { deep: true });

    watch(streams, (val) => {
      for (const stream of val) {
        // find stream and check if changed
        const oldStream = oldStreams.value.find(o => o.id === stream.id);
        if (oldStream
          && (oldStream.isMainCounted !== stream.isMainCounted
            || oldStream.isCompletionistCounted !== stream.isCompletionistCounted
            || oldStream.isExtraCounted !== stream.isExtraCounted
            || oldStream.offset !== stream.offset)) {
          socket.emit('hltb::saveStreamChange', stream, (err: string | null) => {
            if (err) {
              error(err);
            }
          });
        }
      }
      oldStreams.value = cloneDeep(streams.value);
    }, { deep: true });

    watch(gameToAdd, (val) => {
      if (val.trim().length > 0) {
        socket.emit('hltb::addNewGame', gameToAdd.value, (err: string | null) => {
          if (err) {
            error(err);
          }
          gameToAdd.value = '';
          refresh();
        });
      }
    });

    const searchForGame = debounce((value: string)  => {
      if (value.trim().length !== 0) {
        socket.emit('hltb::getGamesFromHLTB', value, (err: string | null, val: string[]) => {
          if (err) {
            return error(err);
          }
          searchForGameOpts.value = val;
        });
      } else {
        searchForGameOpts.value = [];
      }
    }, 500);

    return {
      items,
      streams,
      fields,
      state,
      search,
      fItems,
      getTime,
      getStreamsTimestamp,
      getStreamsOffset,
      timeToReadable,
      timestampToObject,
      minutesFormatter,
      del,
      searchForGame,
      searchForGameOpts,
      gameToAdd,
      translate,
    };
  },
});
</script>

<style scoped>
.centered {
  position: absolute;
  left: 50%;
  top: 0%;
  transform: translate(-50%, 0%);
  padding: 0.5rem;
  margin: 0.2rem;
  background-color: rgba(0,0,0,0.5);
}

.percent {
  font-size: 1.4rem;
}
.small {
  font-size: 0.6rem;
}

img.max {
  max-height: 250px;
  max-width: inherit;
}
</style>