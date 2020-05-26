<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.stats') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.tips') }}
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

    <column-chart :data="generateChartData()" :ytitle="configuration.currency"></column-chart>

    <b-table striped small
      class="mt-3"
      :items="tipsByYear[selectedYear]"
      :fields="fields"
      :sort-by.sync="sortBy"
      :sort-desc.sync="sortDesc">
      <template v-slot:cell(tippedAt)='data'>
        {{ moment(Number(data.item.tippedAt)).format('LLL') }}
      </template>
      <template v-slot:cell(sortAmount)='data'>
        {{ Number(data.item.amount).toFixed(2) }} {{data.item.currency}}
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

  import type { UserTipInterface } from 'src/bot/database/entity/user';

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
        tips: Required<UserTipInterface>[];
        selectedYear: number;

        fields: any;
        sortBy: string;
        sortDesc: boolean;
      } = {
        moment: moment,

        tips: [],
        socket: getSocket('/stats/tips'),
        selectedYear: new Date().getFullYear(),

        fields: [
          { key: 'tippedAt', label: 'tippedAt', sortable: true },
          { key: 'sortAmount', label: 'amount', sortable: true },
          { key: 'message', label: 'message' },
          { key: 'user', label: 'user' },
        ],
        sortBy: 'tippedAt',
        sortDesc: false,
      }
      return object
    },
    computed: {
      years(): string[] {
        return Object.keys(this.tipsByYear);
      },
      tipsByYear(): { [year: number]: Required<UserTipInterface>[]} {
        const d: { [year: number]: Required<UserTipInterface>[] } = {[new Date().getFullYear()]: [] };
        for (const tip of this.tips) {
          const year = new Date(tip.tippedAt).getFullYear();
          if (d[year]) {
            d[year].push(tip);
          } else {
            d[year] = [ tip ];
          }
        }
        return d;
      },
      tipsByMonth(): { [month: number]: Required<UserTipInterface>[]} {
        const d: { [month: number]: Required<UserTipInterface>[] } = {
          0: [], 1: [], 2: [], 3: [], 4: [], 5: [],
          6: [], 7: [], 8: [], 9: [], 10: [], 11: [],
        };
        for (const tip of this.tipsByYear[this.selectedYear]) {
          const month = new Date(tip.tippedAt).getMonth();
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

        for (const [month, tips] of Object.entries(this.tipsByMonth)) {
          const monthFullName = moment().month(month).format("MMMM");

          data.push([
            monthFullName,
            Number(tips.reduce((a, b) => {
              return a + b.sortAmount
            }, 0).toFixed(2)),
          ]);
        }
        return data;
      },
    },
    mounted() {
      this.socket.emit('generic::getAll', (err: string | null, val: Required<UserTipInterface>[]) => {
        if (err) {
          return console.error(err);
        }
        this.tips = val;
      })
    }
  })
</script>

<style scoped>
</style>