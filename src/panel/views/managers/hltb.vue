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
            {{ row.detailsShowing ? 'Hide' : 'Show'}} History (10)
          </b-button>
        </template>
        <template v-slot:row-details="row">
          <b-card>
            <b-row>
              <b-col><b>When</b></b-col>
              <b-col><b>Time</b></b-col>
              <b-col></b-col>
            </b-row>
            <b-row>
              <b-col>{{ (new Date()).toLocaleString() }}</b-col>
              <b-col>1h 25m</b-col>
              <b-col>
                <b-button pill :pressed.sync="myToggleTest" variant="outline-success" size="sm">Main</b-button>
                <b-button pill :pressed.sync="myToggleTest2" variant="outline-success" size="sm">Completionist</b-button>
              </b-col>
            </b-row>
            <b-row>
              <b-col>{{ (new Date()).toLocaleString() }}</b-col>
              <b-col>1h 25m</b-col>
              <b-col>
                <b-button pill :pressed.sync="myToggleTest" variant="outline-success" size="sm">Main</b-button>
                <b-button pill :pressed.sync="myToggleTest2" variant="outline-success" size="sm">Completionist</b-button>
              </b-col>
            </b-row>
            <b-row>
              <b-col>{{ (new Date()).toLocaleString() }}</b-col>
              <b-col>1h 25m</b-col>
              <b-col>
                <b-button pill :pressed.sync="myToggleTest" variant="outline-success" size="sm">Main</b-button>
                <b-button pill :pressed.sync="myToggleTest2" variant="outline-success" size="sm">Completionist</b-button>
              </b-col>
            </b-row>
          </b-card>
        </template>
        <template v-slot:cell(thumbnail)="data">
          <b-img thumbnail width="50" height="50" :src="data.item.imageUrl" :alt="data.item.game + ' thumbnail'"></b-img>
        </template>
        <template v-slot:cell(main)="data">
          {{ getHours(data.item.timeToBeatMain).toFixed(1) }}<small class="small">h</small> / {{ data.item.gameplayMain.toFixed(1) }}<small class="small">h</small>
        </template>
        <template v-slot:cell(completionist)="data">
          {{ getHours(data.item.timeToBeatCompletionist).toFixed(1) }}<small class="small">h</small> / {{ data.item.gameplayCompletionist.toFixed(1) }}<small class="small">h</small>
        </template>
      </b-table>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from '@vue/composition-api'

import { getSocket } from '../../helpers/socket';
import { HowLongToBeatGameInterface } from 'src/bot/database/entity/howLongToBeatGame';
import { error } from 'src/panel/helpers/error';
import translate from 'src/panel/helpers/translate';
import { ButtonStates } from 'src/panel/helpers/buttonStates';

const socket = getSocket('/systems/howlongtobeat');

export default defineComponent({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
    panel: () => import('../../components/panel.vue'),
  },
  setup(props, context) {
    const items = ref([] as HowLongToBeatGameInterface[]);
    const state = ref({
      loading: ButtonStates.progress,
    } as {
      loading: number;
    });
    const search = ref('');

    const getHours = (time: number): number => {
      return Number(time / 1000 / 60 / 60)
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
      { key: 'main', label: translate('systems.hltb.main.name')},
      { key: 'completionist', label: translate('systems.hltb.completionis.name') },
      { key: 'show_details', label: '', },
    ];

    onMounted(() => {
      socket.emit('generic::getAll::filter', { order: { startedAt: 'DESC' } }, (err: string | null, data: HowLongToBeatGameInterface[]) => {
        if (err) {
          return error(err);
        }
        items.value = data;
        state.value.loading = ButtonStates.success;
      })
    })

    const myToggleTest = ref(true);
    const myToggleTest2 = ref(false);

    return {
      items,
      getHours,
      fields,
      state,
      search,
      fItems,
      myToggleTest,
      myToggleTest2,
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