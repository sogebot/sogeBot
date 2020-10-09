<template>
  <div class="container-fluid" ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.howlongtobeat') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'howlongtobeat').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event"/>
    <loading v-if="state.loading !== $state.success"/>
    <template v-else>
      <b-alert show variant="danger" v-if="fItems.length === 0 && search.length > 0">
        <fa icon="search"/> <span v-html="translate('systems.hltb.emptyAfterSearch').replace('$search', search)"/>
      </b-alert>
      <b-alert show v-else-if="items.length === 0">
        {{translate('systems.hltb.empty')}}
      </b-alert>
      <b-table v-else striped small :items="fItems" :fields="fields">
        <template v-slot:cell(show_details)="row">
          <b-button pill size="sm" @click="row.toggleDetails" class="mr-2" :variant="row.detailsShowing ? 'primary' : 'outline-primary'">
            {{ row.detailsShowing ? 'Hide' : 'Show'}} History ({{ streams.filter(o => o.hltb_id === row.item.id).length }})
          </b-button>
        </template>
        <template v-slot:row-details="data">
          <b-card>
            <template v-for="stream of streams.filter(o => o.hltb_id === data.item.id)">
              <b-row :key="stream.id + '1'">
                <b-col><b>{{ translate('systems.hltb.when.name') }}</b></b-col>
                <b-col><b>{{ translate('systems.hltb.time.name') }}</b></b-col>
                <b-col></b-col>
                <b-col>{{ translate('systems.hltb.offset.name') }}</b-col>
              </b-row>
              <b-row :key="stream.id + '2'">
                <b-col>{{ (new Date(stream.createdAt)).toLocaleString() }}</b-col>
                <b-col>{{ timeToReadable(timestampToObject(stream.timestamp)) }}</b-col>
                <b-col>
                  <b-button pill :pressed.sync="stream.isMainCounted" variant="outline-success" size="sm">{{ translate('systems.hltb.main.name') }}</b-button>
                  <b-button pill :pressed.sync="stream.isExtraCounted" variant="outline-success" size="sm">{{ translate('systems.hltb.extra.name') }}</b-button>
                  <b-button pill :pressed.sync="stream.isCompletionistCounted" variant="outline-success" size="sm">{{ translate('systems.hltb.completionist.name') }}</b-button>
                </b-col>
                <b-col>
                  <b-input-group>
                    <b-form-spinbutton v-model="stream.offset" inline step="10000" :formatter-fn="minutesFormatter" :min="-stream.timestamp" :max="Number.MAX_SAFE_INTEGER" repeat-step-multiplier="50"></b-form-spinbutton>
                    <b-button @click="stream.offset = 0" variant="dark"><fa icon="redo" fixed-width/></b-button>
                  </b-input-group>
                </b-col>
              </b-row>
            </template>
          </b-card>
        </template>
        <template v-slot:cell(thumbnail)="data">
          <b-img thumbnail width="70" height="70" :src="data.item.imageUrl" :alt="data.item.game + ' thumbnail'"></b-img>
        </template>
        <template v-slot:cell(startedAt)="data">
          {{ (new Date(data.item.startedAt)).toLocaleString() }}
        </template>
        <template v-slot:cell(main)="data">
          {{ timeToReadable(timestampToObject(getStreamsTimestamp(data.item.id, 'main') + getStreamsOffset(data.item.id, 'main'))) }} / {{ timeToReadable(timestampToObject(data.item.gameplayMain * 3600000)) }}
        </template>
        <template v-slot:cell(extra)="data">
          {{ timeToReadable(timestampToObject(getStreamsTimestamp(data.item.id, 'extra') + getStreamsOffset(data.item.id, 'extra'))) }} / {{ timeToReadable(timestampToObject(data.item.gameplayMainExtra * 3600000)) }}
        </template>
        <template v-slot:cell(completionist)="data">
          {{ timeToReadable(timestampToObject(getStreamsTimestamp(data.item.id, 'completionist') + getStreamsOffset(data.item.id, 'completionist'))) }} / {{ timeToReadable(timestampToObject(data.item.gameplayCompletionist * 3600000)) }}
        </template>
      </b-table>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from '@vue/composition-api'

import { getSocket } from '../../helpers/socket';
import { HowLongToBeatGameInterface, HowLongToBeatGameItemInterface } from 'src/bot/database/entity/howLongToBeatGame';
import { error } from 'src/panel/helpers/error';
import { getTime, timestampToObject } from 'src/bot/helpers/getTime';
import translate from 'src/panel/helpers/translate';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { faRedo } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
library.add(faRedo);

const socket = getSocket('/systems/howlongtobeat');

export default defineComponent({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
    panel: () => import('../../components/panel.vue'),
  },
  setup(props, context) {
    const items = ref([] as HowLongToBeatGameInterface[]);
    const streams = ref([] as HowLongToBeatGameItemInterface[]);
    const state = ref({
      loading: ButtonStates.progress,
    } as {
      loading: number;
    });
    const search = ref('');

    const getStreamsOffset = (hltb_id: string, type: 'extra' | 'main' | 'completionist') => {
      return streams.value
        .filter(o => o.hltb_id === hltb_id && ((type === 'main' && o.isMainCounted) || (type === 'completionist' && o.isCompletionistCounted) || (type === 'extra' && o.isExtraCounted)))
        .reduce((a,b) => a + b.offset, 0);
    }

    const getStreamsTimestamp = (hltb_id: string, type: 'extra' | 'main' | 'completionist') => {
      return streams.value
        .filter(o => o.hltb_id === hltb_id && ((type === 'main' && o.isMainCounted) || (type === 'completionist' && o.isCompletionistCounted) || (type === 'extra' && o.isExtraCounted)))
        .reduce((a,b) => a + b.timestamp, 0);
    }

    const fItems = computed(() => {
      return items.value
        .filter((o) => {
          if (search.value.trim() === '') {
            return true;
          }
          return o.game.trim().toLowerCase().includes(search.value.trim().toLowerCase())
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
        })
    });

    const fields = [
      { key: 'thumbnail', label: '', },
      { key: 'game', label: translate('systems.hltb.game.name'), sortable: true },
      { key: 'startedAt', label: translate('systems.hltb.startedAt.name'), sortable: true },
      { key: 'main', label: translate('systems.hltb.main.name')},
      { key: 'extra', label: translate('systems.hltb.extra.name')},
      { key: 'completionist', label: translate('systems.hltb.completionist.name') },
      { key: 'show_details', label: '', },
    ];

    onMounted(() => {
      socket.emit('generic::getAll', (err: string | null, _games: HowLongToBeatGameInterface[], _streams: HowLongToBeatGameItemInterface[]) => {
        if (err) {
          return error(err);
        }
        items.value = _games;
        streams.value = _streams;
        state.value.loading = ButtonStates.success;
      })
    })

    const timeToReadable = (data: { days: number; hours: number; minutes: number; seconds: number}) => {
      const output = [];
      if (data.days) {
        output.push(`${data.days}d`)
      }
      if (data.hours) {
        output.push(`${data.hours}h`)
      }
      if (data.minutes) {
        output.push(`${data.minutes}m`)
      }
      if (data.seconds || output.length === 0) {
        output.push(`${data.seconds}s`)
      }
      return output.join(' ');
    }
    const minutesFormatter = (value: number) => {
      return (value < 0 ? '- ' : '+ ') + timeToReadable(timestampToObject(Math.abs(value)));
    }

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
      minutesFormatter
    }
  },
})
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