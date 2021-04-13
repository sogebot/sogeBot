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
          {{ translate('menu.bits') }}
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

    <column-chart :data="generateChartData()" />

    <b-table
      striped
      small
      class="mt-3"
      :items="bitsByYear[selectedYear]"
      :fields="fields"
      :sort-by.sync="sortBy"
      :sort-desc.sync="sortDesc"
    >
      <template #cell(cheeredAt)="data">
        {{ dayjs(Number(data.item.cheeredAt)).format('LLL') }}
      </template>
      <template #cell(sortAmount)="data">
        {{ data.item.amount }}
      </template>
      <template #cell(user)="data">
        <router-link :to="{ name: 'viewersManagerEdit', params: { id: data.item.user.userId }}">
          {{ data.item.user.username }}&nbsp;<small class="text-muted">{{ data.item.user.userId }}</small>
        </router-link>
      </template>
    </b-table>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import Chart from 'chart.js';
import Vue from 'vue';
import Chartkick from 'vue-chartkick';

import type { UserBitInterface } from 'src/bot/database/entity/user';
import { dayjs } from 'src/bot/helpers/dayjs';

Vue.use(Chartkick.use(Chart));

export default Vue.extend({
  components: { panel: () => import('../../components/panel.vue') },
  data:       function () {
    const object: {
      dayjs: any;
      translate: any;

      socket: any;
      bits: Required<UserBitInterface>[];
      selectedYear: number;

      fields: any;
      sortBy: string;
      sortDesc: boolean;
    } = {
      dayjs:     dayjs,
      translate: translate,

      bits:         [],
      socket:       getSocket('/stats/bits'),
      selectedYear: new Date().getFullYear(),

      fields: [
        {
          key: 'cheeredAt', label: 'cheeredAt', sortable: true,
        },
        {
          key: 'sortAmount', label: 'amount', sortable: true,
        },
        { key: 'message', label: 'message' },
        { key: 'user', label: 'user' },
      ],
      sortBy:   'cheeredAt',
      sortDesc: false,
    };
    return object;
  },
  computed: {
    years(): string[] {
      return Object.keys(this.bitsByYear);
    },
    bitsByYear(): { [year: number]: Required<UserBitInterface>[]} {
      const d: { [year: number]: Required<UserBitInterface>[] } = { [new Date().getFullYear()]: [] };
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
        0:  [], 1:  [], 2:  [], 3:  [], 4:  [], 5:  [],
        6:  [], 7:  [], 8:  [], 9:  [], 10: [], 11: [],
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
    },
  },
  mounted() {
    this.socket.emit('generic::getAll', (err: string | null, val: Required<UserBitInterface>[]) => {
      if (err) {
        return console.error(err);
      }
      this.bits = val;
    });
  },
  methods: {
    generateChartData(): [ string, number ][] {
      const data: [ string, number ][] = [];

      for (const [month, bits] of Object.entries(this.tipsByMonth)) {
        const monthFullName = dayjs().month(Number(month)).format('MMMM');

        data.push([
          monthFullName,
          bits.reduce((a, b) => {
            return a + b.amount;
          }, 0),
        ]);
      }
      return data;
    },
  },
});
</script>

<style scoped>
</style>