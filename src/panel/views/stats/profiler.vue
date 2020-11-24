<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.stats') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.profiler') }}
        </span>
      </div>
    </div>

    <panel/>

    <line-chart :data="generateChartData()"></line-chart>

    <b-table-simple small striped class="mt-3">
      <b-thead head-variant="dark">
        <b-tr>
          <b-th>Function</b-th>
          <b-th>Samples</b-th>
          <b-th>Min time</b-th>
          <b-th>Max time</b-th>
          <b-th>Average time</b-th>
          <b-th></b-th>
        </b-tr>
      </b-thead>
      <b-tbody>
        <b-tr v-for="key of Object.keys(profiler)" :key="key">
          <b-th scope="row">{{ key }}</b-th>
          <b-td><small class="text-muted">{{profiler[key].length}}</small></b-td>
          <b-td>{{ min(profiler[key]) }} <small class="text-muted">ms</small></b-td>
          <b-td>{{ max(profiler[key]) }} <small class="text-muted">ms</small></b-td>
          <b-td>{{ avg(profiler[key]) }} <small class="text-muted">ms</small></b-td>
          <b-td>
            <button
              class="btn border-0"
              @click="toggleFunctionChart(key)"
              :class="[showChartFunctions.includes(key) ? 'btn-success' : 'btn-outline-dark']">
              <font-awesome-icon icon="chart-line"></font-awesome-icon>
            </button>
          </b-td>
        </b-tr>
      </b-tbody>
    </b-table-simple>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from '@vue/composition-api'
import Vue from 'vue';

import Chartkick from 'vue-chartkick';
import Chart from 'chart.js';
import translate from 'src/panel/helpers/translate';

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons';

library.add(faChartLine)
Vue.use(Chartkick.use(Chart));

import { getSocket } from '../../helpers/socket';

const socket = getSocket('/stats/profiler');

export default defineComponent({
  components: {
    panel: () => import('../../components/panel.vue'),
    'font-awesome-icon': FontAwesomeIcon,
  },
  setup() {
    const showChartFunctions = ref([] as string[]);
    const profiler = ref({} as Record<string, number[]>);

    const generateChartData = () => {
      const data = Object.entries(profiler.value)
      const generatedData = [];

      for (const [name, values] of data) {
        if (showChartFunctions.value.includes(name)) {
        generatedData.push({
          name, data: { ...values },
        })
        }
      };
      return generatedData;
    };

    const toggleFunctionChart = (key: string) => {
      if (showChartFunctions.value.includes(key)) {
        showChartFunctions.value = showChartFunctions.value.filter((o) => o !== key);
      } else {
        showChartFunctions.value.push(key);
      }
    };

    const avg = (data: number[]) => {
      return data.reduce((a, b) => (a+b)) / data.length;
    }

    const max = (data: number[]) => {
      return Math.max(...data);
    }

    const min = (data: number[]) => {
      return Math.min(...data);
    }

    watch(showChartFunctions, () => {
      localStorage.setItem('/stats/commandcount/showChartFunctions', JSON.stringify(showChartFunctions.value))
    })

    onMounted(() => {
      showChartFunctions.value = JSON.parse(localStorage.getItem('/stats/commandcount/showChartFunctions') || '[]')
      socket.emit('profiler::load', (err: string | null, val: any) => {
        if (err) {
          return console.error(err);
        }
        profiler.value = Object.fromEntries(val);
      })
    })

    return {
      showChartFunctions,
      profiler,

      generateChartData,
      toggleFunctionChart,
      avg,
      min,
      max,

      translate,
    }
  }
})
</script>

<style scoped>
</style>