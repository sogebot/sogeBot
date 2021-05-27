<template>
  <div
    ref="window"
    class="container-fluid"
  >
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.stats') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.tips') }}
        </span>
      </div>
    </div>

    <panel>
      <template slot="right">
        <div class="form-group">
          <b-form-select
            v-model="selectedYear"
            :options="years"
          />
        </div>
      </template>
    </panel>

    <column-chart
      :data="generateChartData()"
      :ytitle="$store.state.configuration.currency"
    />

    <b-table
      striped
      small
      class="mt-3"
      :items="tipsByYear[selectedYear]"
      :fields="fields"
      :sort-by.sync="sortBy"
      :sort-desc.sync="sortDesc"
    >
      <template #cell(tippedAt)="data">
        {{ dayjs(Number(data.item.tippedAt)).format('LLL') }}
      </template>
      <template #cell(sortAmount)="data">
        {{ Intl.NumberFormat($store.state.configuration.lang, { style: 'currency', currency: data.item.currency }).format(data.item.amount) }}
      </template>
      <template #cell(user)="data">
        <router-link :to="{ name: 'viewersManagerEdit', params: { id: data.item.userId }}">
          {{ data.item.username }}&nbsp;<small class="text-muted">{{ data.item.userId }}</small>
        </router-link>
      </template>
    </b-table>
  </div>
</template>

<script lang="ts">
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import Chart from 'chart.js';
import Vue from 'vue';
import Chartkick from 'vue-chartkick';

import type { UserTipInterface } from 'src/bot/database/entity/user';

Vue.use(Chartkick.use(Chart));

export default Vue.extend({
  components: { panel: () => import('../../components/panel.vue') },
  data:       function () {
    const object: {
      dayjs: any;
      translate: any;

      socket: any;
      tips: Required<UserTipInterface>[];
      selectedYear: number;

      fields: any;
      sortBy: string;
      sortDesc: boolean;
    } = {
      dayjs:     dayjs,
      translate: translate,

      tips:         [],
      socket:       getSocket('/stats/tips'),
      selectedYear: new Date().getFullYear(),

      fields: [
        {
          key: 'tippedAt', label: 'tippedAt', sortable: true,
        },
        {
          key: 'sortAmount', label: 'amount', sortable: true,
        },
        { key: 'message', label: 'message' },
        { key: 'user', label: 'user' },
      ],
      sortBy:   'tippedAt',
      sortDesc: false,
    };
    return object;
  },
  computed: {
    years(): string[] {
      return Object.keys(this.tipsByYear);
    },
    tipsByYear(): { [year: number]: Required<UserTipInterface>[]} {
      const d: { [year: number]: Required<UserTipInterface>[] } = { [new Date().getFullYear()]: [] };
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
        0:  [], 1:  [], 2:  [], 3:  [], 4:  [], 5:  [],
        6:  [], 7:  [], 8:  [], 9:  [], 10: [], 11: [],
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
    },
  },
  mounted() {
    this.socket.emit('generic::getAll', (err: string | null, val: Required<UserTipInterface>[]) => {
      if (err) {
        return console.error(err);
      }
      this.tips = val;
    });
  },
  methods: {
    generateChartData(): [ string, number ][] {
      const data: [ string, number ][] = [];

      for (const [month, tips] of Object.entries(this.tipsByMonth)) {
        const monthFullName = dayjs().month(Number(month)).format('MMMM');

        data.push([
          monthFullName,
          Number(tips.reduce((a, b) => {
            return a + b.sortAmount;
          }, 0).toFixed(2)),
        ]);
      }
      return data;
    },
  },
});
</script>

<style scoped>
</style>