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
          {{ translate('menu.commandcount') }}
        </span>
      </div>
    </div>

    <panel cards>
      <template slot="right">
        <div class="form-group">
          <b-form-datepicker
            v-model="fromDate"
            :max="maxFrom"
            value-as-date
          />
          <b-form-datepicker
            v-model="toDate"
            :min="minTo"
            :max="maxTo"
            value-as-date
          />
        </div>
      </template>
    </panel>

    <line-chart :data="generateChartData()" />

    <table class="table table-striped">
      <thead>
        <tr>
          <th
            scope="col"
            class="border-0 pb-0"
          >
            {{ translate('stats.commandcount.command') }}
          </th>
          <th
            colspan="5"
            scope="col"
            class="border-0 pb-0 text-center"
          >
            {{ translate('stats.commandcount.usage') }}
          </th>
          <th
            scope="col"
            class="border-0 pb-0 "
          />
        </tr>
        <tr>
          <th
            scope="col"
            class="pt-0"
          />
          <th
            scope="col"
            class="pt-0"
          >
            {{ translate('stats.commandcount.hour') }}
          </th>
          <th
            scope="col"
            class="pt-0"
          >
            {{ translate('stats.commandcount.day') }}
          </th>
          <th
            scope="col"
            class="pt-0"
          >
            {{ translate('stats.commandcount.week') }}
          </th>
          <th
            scope="col"
            class="pt-0"
          >
            {{ translate('stats.commandcount.month') }}
          </th>
          <th
            scope="col"
            class="pt-0"
          >
            {{ translate('stats.commandcount.year') }}
          </th>
          <th
            scope="col"
            class="pt-0"
          >
            {{ translate('stats.commandcount.total') }}
          </th>
          <th
            scope="col"
            class="pt-0"
          />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="command of commands"
          :key="command"
        >
          <th scope="row">
            {{ command }}
          </th>
          <td>{{ totalInInterval(command, 1000 * 60 * 60) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24 * 7) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24 * 30) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24 * 365) }}</td>
          <td>{{ total(command) }}</td>
          <td>
            <button
              class="btn border-0"
              :class="[showChartCommands.includes(command) ? 'btn-success' : 'btn-outline-dark']"
              @click="toggleCommandChart(command)"
            >
              <font-awesome-icon icon="chart-line" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faChartLine } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import Chart from 'chart.js';
import { countBy } from 'lodash-es';
import Vue from 'vue';
import Chartkick from 'vue-chartkick';

library.add(faChartLine);
Vue.use(Chartkick.use(Chart));

export default Vue.extend({
  components: {
    panel:               () => import('../../components/panel.vue'),
    'font-awesome-icon': FontAwesomeIcon,
  },
  data: function () {
    const object: {
      socket: any,
      translate: any,
      commandsUsage: {
        _id: string,
        command: string,
        timestamp: number,
      }[],
      showChartCommands: string[],
      maxFrom: Date,
      minTo: Date,
      maxTo: Date,
      fromDate: Date,
      toDate: Date,
    } = {
      translate:         translate,
      socket:            getSocket('/stats/commandcount'),
      commandsUsage:     [],
      showChartCommands: [],
      maxFrom:           new Date(new Date().getFullYear(), (new Date().getMonth() + 1), (new Date().getDate() - 1)),
      maxTo:             new Date(),
      minTo:             new Date(new Date().getFullYear(), (new Date().getMonth() + 1), (new Date().getDate() - 13)),
      fromDate:          new Date(new Date().getFullYear(), (new Date().getMonth() + 1), (new Date().getDate() - 14)),
      toDate:            new Date(new Date().getFullYear(), (new Date().getMonth() + 1), new Date().getDate()),
    };
    return object;
  },
  computed: {
    commands(): string[] {
      return [...new Set(this.commandsUsage.map(o => o.command))];
    },
    timestampList(): number[] {
      const from = new Date(this.fromDate).getTime();
      const to = new Date(this.toDate).getTime();

      const list: number[] = [];
      for (
        let timestamp = (from / (this.timestampSmooth) * (this.timestampSmooth));
        timestamp <= (to / (this.timestampSmooth) * (this.timestampSmooth));
        timestamp = timestamp + (this.timestampSmooth)) {
        list.push(timestamp);
      }
      return list;
    },
    timestampSmooth(): number {
      const from = new Date(this.fromDate).getTime();
      const to = new Date(this.toDate).getTime();

      const list: number[] = [];
      for (
        let timestamp = (from / (1000 * 60 * 30) * (1000 * 60 * 30));
        timestamp <= (to / (1000 * 60 * 30) * (1000 * 60 * 30));
        timestamp = timestamp + (1000 * 60 * 30)) {
        list.push(timestamp);
      }

      if (list.length <= (48 /*day*/ * 1)) {
        return 1000 * 60 * 30; // half hour
      } else if (list.length <= (48 /*day*/ * 2)) {
        return 1000 * 60 * 60; // hour
      } else if (list.length <= (48 /*day*/ * 3)) {
        return 1000 * 60 * 60 * 2; // 2 hours
      } else if (list.length <= (48 /*day*/ * 6)) {
        return 1000 * 60 * 60 * 4; // 4 hours
      } else if (list.length <= (48 /*day*/ * 12)) {
        return 1000 * 60 * 60 * 8; // 8 hours
      } else if (list.length <= (48 /*day*/ * 21)) {
        return 1000 * 60 * 60 * 12; // 12 hours
      } else if (list.length <= (48 /*day*/ * 30)) {
        return 1000 * 60 * 60 * 24; // day
      } else if (list.length <= (48 /*day*/ * 365)) {
        return 1000 * 60 * 60 * 24 * 30; // month
      } else {
        return 1000 * 60 * 60 * 24 * 30 * 12; // year
      }
    },
  },
  watch: {
    showChartCommands() {
      localStorage.setItem('/stats/commandcount/showChartCommands', JSON.stringify(this.showChartCommands));
    },
    toDate(val) {
      this.maxFrom = new Date(val);
      this.maxFrom.setDate(new Date(this.maxFrom).getDate() - 1);
      localStorage.setItem('/stats/commandcount/toDate', val);
    },
    fromDate(val) {
      this.minTo = new Date(val);
      this.minTo.setDate(new Date(this.minTo).getDate() + 1);
      if (this.toDate.getTime() < this.minTo.getTime()) {
        this.toDate.setDate(new Date(this.minTo).getDate() + 1);
      }
      localStorage.setItem('/stats/commandcount/fromDate', val);
    },
  },
  mounted() {
    this.socket.emit('commands::count', (err: string | null, val: { command: string, timestamp: number, _id: string }[]) => {
      if (err) {
        return console.error(err);
      }

      const cacheShowChartCommands = localStorage.getItem('/stats/commandcount/showChartCommands');
      if (!cacheShowChartCommands) {
        this.showChartCommands = val.splice(0, 5).map(o => o.command);
        localStorage.setItem('/stats/commandcount/showChartCommands', JSON.stringify(this.showChartCommands));
      } else {
        this.showChartCommands = JSON.parse(cacheShowChartCommands);
      }

      const cacheFromDate = localStorage.getItem('/stats/commandcount/fromDate');
      if (!cacheFromDate) {
        this.fromDate = new Date(new Date().getFullYear(), (new Date().getMonth() + 1), (new Date().getDate() - 14));
        localStorage.setItem('/stats/commandcount/fromDate', String(this.fromDate));
      } else {
        this.fromDate = new Date(cacheFromDate);
      }

      const cacheToDate = localStorage.getItem('/stats/commandcount/toDate');
      if (!cacheToDate) {
        this.toDate = new Date(new Date().getFullYear(), (new Date().getMonth() + 1), new Date().getDate());
        localStorage.setItem('/stats/commandcount/toDate', String(this.toDate));
      } else {
        this.toDate = new Date(cacheToDate);
      }
      this.commandsUsage = val;
    });
  },
  methods: {
    toggleCommandChart(command: string) {
      if (this.showChartCommands.includes(command)) {
        this.showChartCommands = this.showChartCommands.filter((o) => o !== command);
      } else {
        this.showChartCommands.push(command);
      }
    },
    generateChartData(): {
      name: string; data: { [x: string]: number };
    }[] {
      const data: {
        name: string; data: { [x: string]: number };
      }[] = [];

      const from = new Date(this.fromDate).getTime();
      const to = new Date(this.toDate).getTime();

      for (const command of this.commands) {
        if (!this.showChartCommands.includes(command)) {
          continue;
        }
        const timestamps = this.commandsUsage
          .filter(o => {
            const isCommand = o.command === command;
            const isHigherThanFromDate = o.timestamp >= from;
            const isLowerThanToDate = o.timestamp <= to;
            return isCommand && isHigherThanFromDate && isLowerThanToDate;
          })
          .map(o => {
            // find smooth timestamp
            let timestamp = from;
            while(timestamp <= o.timestamp) {
              timestamp += this.timestampSmooth;
            }
            if (timestamp > to) {
              timestamp = to;
            }
            return timestamp;
          });
        const countByTimestamps = countBy(timestamps);
        for (const t of this.timestampList) {
          if (!countByTimestamps[t]) {
            countByTimestamps[t] = 0;
          }
        }
        const countByTimestampsOrdered: any = {};
        for (const k of Object.keys(countByTimestamps).sort()) {
          countByTimestampsOrdered[new Date(Number(k)).toLocaleString()] = countByTimestamps[k];
        }
        data.push({
          name: command,
          data: countByTimestampsOrdered,
        });
      }
      return data;
    },
    totalInInterval(command: string, interval: number): number {
      return this.commandsUsage.filter(o => {
        const isCorrectCommand = o.command === command;
        const isInInterval = Date.now() - interval <= o.timestamp;
        return isCorrectCommand && isInInterval;
      }).length;
    },
    total(command: string): number {
      return this.commandsUsage.filter(o => o.command === command).length;
    },
  },
});
</script>

<style scoped>
</style>