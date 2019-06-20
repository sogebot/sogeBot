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

    <panel cards></panel>

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

  import io from 'socket.io-client';

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      'font-awesome-icon': FontAwesomeIcon
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
        showChartInterval: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all',
      } = {
        socket: io('/stats/commandcount', { query: "token=" + this.token }),
        commandsUsage: [],
        showChartCommands: [],
        showChartInterval: 'year',
      }
      return object
    },
    watch: {
      showChartCommands() {
        localStorage.setItem('/stats/commandcount/showChartCommands', JSON.stringify(this.showChartCommands))
      }
    },
    computed: {
      commands(): string[] {
        return [...new Set(this.commandsUsage.map(o => o.command))];
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

        for (const command of this.commands) {
          if (!this.showChartCommands.includes(command)) {
            continue;
          }
          const timestamps = this.commandsUsage
            .filter(o => o.command === command)
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(o => {
              return new Date(Number(Number(o.timestamp / (1000 * 60 * 30)).toFixed()) * (1000 * 60 * 30)).toLocaleString();
            })
          console.log({timestamps})
          data.push({
            name: command,
            data: this._.countBy(timestamps),
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