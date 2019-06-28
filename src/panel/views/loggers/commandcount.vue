<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.stats') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.commandcount') }}
        </span>
      </div>
    </div>

    <panel cards>
      <template slot="right">
        <div class="form-group">
          <datetime v-model="fromDate" :config="dateTimePickerFrom" class="form-control"></datetime>
          <datetime v-model="toDate" :config="dateTimePickerTo" class="form-control"></datetime>
        </div>
      </template>
    </panel>

    <line-chart :data="generateChartData()"></line-chart>

    <table class="table table-striped">
      <thead>
        <tr>
          <th scope="col" class="border-0 pb-0">{{ translate('stats.commandcount.command') }}</th>
          <th colspan="5" scope="col" class="border-0 pb-0 text-center">{{ translate('stats.commandcount.usage') }}</th>
          <th scope="col" class="border-0 pb-0 "></th>
        </tr>
        <tr>
          <th scope="col" class="pt-0"></th>
          <th scope="col" class="pt-0">{{ translate('stats.commandcount.hour') }}</th>
          <th scope="col" class="pt-0">{{ translate('stats.commandcount.day') }}</th>
          <th scope="col" class="pt-0">{{ translate('stats.commandcount.week') }}</th>
          <th scope="col" class="pt-0">{{ translate('stats.commandcount.month') }}</th>
          <th scope="col" class="pt-0">{{ translate('stats.commandcount.year') }}</th>
          <th scope="col" class="pt-0">{{ translate('stats.commandcount.total') }}</th>
          <th scope="col" class="pt-0"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="command of commands" :key="command">
          <th scope="row">{{ command }}</th>
          <td>{{ totalInInterval(command, 1000 * 60 * 60) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24 * 7) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24 * 30) }}</td>
          <td>{{ totalInInterval(command, 1000 * 60 * 60 * 24 * 365) }}</td>
          <td>{{ total(command) }}</td>
          <td>
            <button
              class="btn border-0"
              @click="toggleCommandChart(command)"
              :class="[showChartCommands.includes(command) ? 'btn-success' : 'btn-outline-dark']">
              <font-awesome-icon icon="chart-line"></font-awesome-icon>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue';
  import Chartkick from 'vue-chartkick';
  import Chart from 'chart.js';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faChartLine } from '@fortawesome/free-solid-svg-icons';

  library.add(faChartLine)
  Vue.use(Chartkick.use(Chart));

  import VueFlatPickr from 'vue-flatpickr-component';
  import 'flatpickr/dist/flatpickr.css';

  import io from 'socket.io-client';

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      'font-awesome-icon': FontAwesomeIcon,
      datetime: VueFlatPickr,
    },
    data: function () {
      const object: {
        socket: any,
        commandsUsage: {
          _id: string,
          command: string,
          timestamp: number,
        }[],
        showChartCommands: string[],
        dateTimePickerFrom: any,
        dateTimePickerTo: any,
        fromDate: string,
        toDate: string,
      } = {
        socket: io('/stats/commandcount', { query: "token=" + this.token }),
        commandsUsage: [],
        showChartCommands: [],
        dateTimePickerFrom: {
          maxDate: new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + (new Date().getDate() - 1),
        },
        dateTimePickerTo: {
          maxDate: new Date(),
          minDate: new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + (new Date().getDate() - 13),
        },
        fromDate: new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + (new Date().getDate() - 14),
        toDate: new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate(),
      }
      return object
    },
    watch: {
      showChartCommands() {
        localStorage.setItem('/stats/commandcount/showChartCommands', JSON.stringify(this.showChartCommands))
      },
      toDate() {
        Vue.set(this.dateTimePickerFrom, 'maxDate',
          new Date(this.toDate).getFullYear() + '-' +
          (new Date(this.toDate).getMonth() + 1) + '-' +
          (new Date(this.toDate).getDate() - 1));
      },
      fromDate() {
        Vue.set(this.dateTimePickerTo, 'minDate',
          new Date(this.fromDate).getFullYear() + '-' +
          (new Date(this.fromDate).getMonth() + 1) + '-' +
          (new Date(this.fromDate).getDate() + 1));
      }
    },
    computed: {
      commands(): string[] {
        return [...new Set(this.commandsUsage.map(o => o.command))];
      },
      timestampList(): number[] {
        const from = new Date(this.fromDate).getTime()
        const to = new Date(this.toDate).getTime();

        const list: number[] = []
        for (
          let timestamp = (from / (this.timestampSmooth) * (this.timestampSmooth));
          timestamp <= (to / (this.timestampSmooth) * (this.timestampSmooth));
          timestamp = timestamp + (this.timestampSmooth)) {
            list.push(timestamp);
        }
        return list;
      },
      timestampSmooth(): number {
        const from = new Date(this.fromDate).getTime()
        const to = new Date(this.toDate).getTime();

        const list: number[] = []
        for (
          let timestamp = (from / (1000 * 60 * 30) * (1000 * 60 * 30));
          timestamp <= (to / (1000 * 60 * 30) * (1000 * 60 * 30));
          timestamp = timestamp + (1000 * 60 * 30)) {
            list.push(timestamp);
        }

        if (list.length <= (48 /*day*/ * 1)) {
          return 1000 * 60 * 30 // half hour
        } else if (list.length <= (48 /*day*/ * 2)) {
          return 1000 * 60 * 60 // hour
        } else if (list.length <= (48 /*day*/ * 3)) {
          return 1000 * 60 * 60 * 2 // 2 hours
        } else if (list.length <= (48 /*day*/ * 6)) {
          return 1000 * 60 * 60 * 4 // 4 hours
        } else if (list.length <= (48 /*day*/ * 12)) {
          return 1000 * 60 * 60 * 8 // 8 hours
        } else if (list.length <= (48 /*day*/ * 21)) {
          return 1000 * 60 * 60 * 12 // 12 hours
        } else if (list.length <= (48 /*day*/ * 30)) {
          return 1000 * 60 * 60 * 24 // day
        } else if (list.length <= (48 /*day*/ * 365)) {
          return 1000 * 60 * 60 * 24 * 30 // month
        } else {
          return 1000 * 60 * 60 * 24 * 30 * 12 // year
        }
      }
    },
    methods: {
      toggleCommandChart(command) {
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

        const from = new Date(this.fromDate).getTime()
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
              return Number(Number(o.timestamp / (this.timestampSmooth)).toFixed()) * this.timestampSmooth;
            })
          const countByTimestamps = this._.countBy(timestamps)
          for (const t of this.timestampList) {
            if (!countByTimestamps[t]) {
              countByTimestamps[t] = 0;
            }
          }
          const countByTimestampsOrdered = {}
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
          const isCorrectCommand = o.command === command;;
          const isInInterval = Date.now() - interval <= o.timestamp;
          return isCorrectCommand && isInInterval;
        }).length;
      },
      total(command: string): number {
        return this.commandsUsage.filter(o => o.command === command).length;
      }
    },
    mounted() {
      if (localStorage.getItem('/stats/commandcount/showChartCommands')) {
        this.showChartCommands = JSON.parse(localStorage.getItem('/stats/commandcount/showChartCommands') || '[]')
      }

      this.socket.emit('find', { collection: '_core.commands.count' }, (err, val) => {
        if (err) {
          return console.error(err)
        } else {
          this.commandsUsage = val;
        }
      })
    }
  })
</script>

<style scoped>
</style>