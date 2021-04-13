<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.stats') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.api') }}
        </span>
      </b-col>
    </b-row>

    <panel>
      <template #left>
        <div class="btn-group">
          <button
            class="btn border-0"
            :class="[selected === 'helix' ? 'btn-primary' : 'btn-outline-primary']"
            @click="selected = 'helix'"
          >
            HELIX <small>({{ data.filter(o => o.api === 'helix').length }})</small>
          </button>
          <button
            class="btn border-0"
            :class="[selected === 'other' ? 'btn-primary' : 'btn-outline-primary']"
            @click="selected = 'other'"
          >
            OTHER <small>({{ data.filter(o => o.api === 'other').length }})</small>
          </button>
          <button
            class="btn border-0"
            :class="[selected === 'unofficial' ? 'btn-primary' : 'btn-outline-primary']"
            @click="selected = 'unofficial'"
          >
            UNOFFICIAL <small>({{ data.filter(o => o.api === 'unofficial').length }})</small>
          </button>
        </div>
      </template>
    </panel>

    <loading
      v-if="selectedData.length === 0"
      slow
    />
    <template v-else>
      <area-chart :data="graphData" />
      <table class="table table-hover">
        <thead class="thead-dark">
          <tr>
            <th scope="col">
              time
            </th>
            <th scope="col">
              name
            </th>
            <th scope="col" />
            <th scope="col">
              remaining API calls
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) of selectedData"
            :key="index"
            :class="{'bg-danger': !String(item.code).startsWith('2'), 'text-light': !String(item.code).startsWith('2') }"
          >
            <th scope="row">
              {{ dayjs(item.timestamp).format('LTS') }}
            </th>
            <td>{{ item.call }}</td>
            <td>
              <div style="word-wrap: break-word; font-family: Monospace; overflow-y: auto; overflow-x: hidden; max-height:200px;">
                <strong>{{ item.method }}</strong> {{ item.endpoint }} {{ item.code }}
              </div>

              <pre
                v-if="item.request"
                class="pt-1"
                style="word-wrap: break-word; font-family: Monospace;overflow-y: auto; overflow-x: hidden; max-height:200px; width:100%;"
              >{{ parseJSON(item.request) }}</pre>
              <pre
                class="pt-3"
                style="word-wrap: break-word; font-family: Monospace;overflow-y: auto; overflow-x: hidden; max-height:200px; width:100%;"
              >{{ parseJSON(item.data) }}</pre>
            </td>
            <td><pre>{{ parseJSON(item.remaining) }}</pre></td>
          </tr>
        </tbody>
      </table>
    </template>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, ref,
} from '@vue/composition-api';
import Chart from 'chart.js';
import {
  get, groupBy, isNil,
} from 'lodash-es';
import Vue from 'vue';
import Chartkick from 'vue-chartkick';

import { dayjs } from 'src/bot/helpers/dayjs';

Vue.use(Chartkick.use(Chart));

const socket = getSocket('/');

export default defineComponent({
  components: { 'loading': () => import('../../components/loading.vue') },
  setup() {
    const selected = ref('helix');
    const data = ref([] as any[]);

    const selectedData = computed(() => {
      return data.value.filter(o => o.api === selected.value).sort((a, b) => b.timestamp - a.timestamp);
    });

    const graphData = computed(() => {
      const success = data.value.filter(o => o.api === selected.value && String(o.code).startsWith('2'));
      const errors = data.value.filter(o => o.api === selected.value && !String(o.code).startsWith('2'));

      const successPerMinute: any = {};
      const _successPerMinute = groupBy(success, o => {
        return (new Date(o.timestamp)).getHours() + ':' + (new Date(o.timestamp)).getMinutes();
      });
      for (const minute of Object.keys(_successPerMinute)) {
        const timestamp = String(new Date(_successPerMinute[minute][0].timestamp));
        successPerMinute[timestamp] = _successPerMinute[minute].length;
      }

      const errorsPerMinute: any = {};
      const _errorsPerMinute = groupBy(errors, o => {
        return (new Date(o.timestamp)).getMinutes();
      });
      for (const minute of Object.keys(_errorsPerMinute)) {
        const timestamp = String(new Date(_errorsPerMinute[minute][0].timestamp));
        errorsPerMinute[timestamp] = _errorsPerMinute[minute].length;
      }

      // we need to have same datas for timestamps if errors are 0
      for (const [timestamp] of Object.entries(successPerMinute)) {
        if (!errorsPerMinute[timestamp]) {
          errorsPerMinute[timestamp] = 0;
        }
      }

      return [
        { name: 'Success', data: successPerMinute },
        { name: 'Errors', data: errorsPerMinute },
      ];
    });

    onMounted(() => {
      socket.off('api.stats').on('api.stats', (c: { code: number, remaining: number | string, data: string}) => {
        c.code = get(c, 'code', 200); // set default to 200
        c.data = !isNil(c.data) ? JSON.stringify(c.data) : 'n/a';
        c.remaining = !isNil(c.remaining) ? c.remaining : 'n/a';

        data.value.push(c);
      });
    });

    function parseJSON(JSONString: string) {
      try {
        return JSON.stringify(JSON.parse(JSONString), null, 2);
      } catch (e) {
        return JSONString;
      }
    }

    return {
      data,
      selected,
      parseJSON,
      selectedData,
      graphData,

      dayjs,
      translate,
    };
  },
});
</script>