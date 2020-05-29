<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.stats') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.bits') }}
        </span>
      </div>
    </div>

    <panel>
      <template slot="right">
        <div class="form-group">
          <b-form-select v-model="selectedYear" :options="years"></b-form-select>
        </div>
      </template>
    </panel>

    <column-chart :data="generateChartData()"></column-chart>

    <b-table striped small
      class="mt-3"
      :items="bitsByYear[selectedYear]"
      :fields="fields"
      :sort-by.sync="sortBy"
      :sort-desc.sync="sortDesc">
      <template v-slot:cell(cheeredAt)='data'>
        {{ moment(Number(data.item.cheeredAt)).format('LLL') }}
      </template>
      <template v-slot:cell(sortAmount)='data'>
        {{ data.item.amount }}
      </template>
      <template v-slot:cell(user)='data'>
        <router-link :to="{ name: 'viewersManagerEdit', params: { id: data.item.user.userId }}">
          {{ data.item.user.username }}&nbsp;<small class="text-muted">{{ data.item.user.userId }}</small>
        </router-link>
      </template>
    </b-table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import Chartkick from 'vue-chartkick';
  import Chart from 'chart.js';
  import moment from 'moment';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faChartLine } from '@fortawesome/free-solid-svg-icons';

  import type { UserBitInterface } from 'src/bot/database/entity/user';

  library.add(faChartLine)
  Vue.use(Chartkick.use(Chart));

  import { getSocket } from '../../helpers/socket';

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      'font-awesome-icon': FontAwesomeIcon,
    },
    data: function () {
      const object: {
        moment: any;

        socket: any;
        bits: Required<UserBitInterface>[];
        selectedYear: number;

        fields: any;
        sortBy: string;
        sortDesc: boolean;
      } = {
        moment: moment,

        bits: [],
        socket: getSocket('/stats/bits'),
        selectedYear: new Date().getFullYear(),

        fields: [
          { key: 'cheeredAt', label: 'cheeredAt', sortable: true },
          { key: 'sortAmount', label: 'amount', sortable: true },
          { key: 'message', label: 'message' },
          { key: 'user', label: 'user' },
        ],
        sortBy: 'cheeredAt',
        sortDesc: false,
      }
      return object
    },
    computed: {
      years(): string[] {
        return Object.keys(this.bitsByYear);
      },
      bitsByYear(): { [year: number]: Required<UserBitInterface>[]} {
        const d: { [year: number]: Required<UserBitInterface>[] } = {[new Date().getFullYear()]: [] };
        for (const tip of this.bits) {
          const year = new Date(tip.cheeredAt).getFullYear();
          if (d[year]) {
            d[year].push(tip);
          } else {
            d[year] = [ tip ];
          }
        }
        return d;
      },
      tipsByMonth(): { [month: number]: Required<UserBitInterface>[]} {
        const d: { [month: number]: Required<UserBitInterface>[] } = {
          0: [], 1: [], 2: [], 3: [], 4: [], 5: [],
          6: [], 7: [], 8: [], 9: [], 10: [], 11: [],
        };
        for (const tip of this.bitsByYear[this.selectedYear]) {
          const month = new Date(tip.cheeredAt).getMonth();
          if (d[month]) {
            d[month].push(tip);
          } else {
            d[month] = [ tip ];
          }
        }
        return d;
      }
    },
    methods: {
      generateChartData(): [ string, number ][] {
        const data: [ string, number ][] = [];

        for (const [month, bits] of Object.entries(this.tipsByMonth)) {
          const monthFullName = moment().month(month).format("MMMM");

          data.push([
            monthFullName,
            bits.reduce((a, b) => {
              return a + b.amount
            }, 0),
          ]);
        }
        return data;
      },
    },
    mounted() {
      this.socket.emit('generic::getAll', (err: string | null, val: Required<UserBitInterface>[]) => {
        if (err) {
          return console.error(err);
        }
        this.bits = val;
      })
    }
  })
</script>

<style scoped>
</style>