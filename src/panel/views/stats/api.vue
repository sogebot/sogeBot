<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.stats') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.api') }}
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
       <div class="btn-group">
          <button class="btn border-0"
            :class="[selected === 'helix' ? 'btn-primary' : 'btn-outline-primary']"
            @click="selected = 'helix'">HELIX <small>({{ data.filter(o => o.api === 'helix').length }})</small></button>
          <button class="btn border-0"
            :class="[selected === 'other' ? 'btn-primary' : 'btn-outline-primary']"
            @click="selected = 'other'">OTHER <small>({{ data.filter(o => o.api === 'other').length }})</small></button>
          <button class="btn border-0"
            :class="[selected === 'unofficial' ? 'btn-primary' : 'btn-outline-primary']"
            @click="selected = 'unofficial'">UNOFFICIAL <small>({{ data.filter(o => o.api === 'unofficial').length }})</small></button>
        </div>
      </template>
    </panel>

    <loading v-if="selectedData.length === 0" slow />
    <template v-else>
      <area-chart :data="graphData"></area-chart>
      <table class="table table-hover">
      <thead class="thead-dark">
          <tr>
            <th scope="col">time</th>
            <th scope="col">call</th>
            <th scope="col">endpoint</th>
            <th scope="col">status</th>
            <th scope="col">remaining API calls</th>
            <th scope="col">data</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) of selectedData" :key="index"
              :class="{'bg-danger': !String(item.code).startsWith('2'), 'text-light': !String(item.code).startsWith('2') }">
            <th scope="row">{{ moment(item.timestamp).format('LTS') }}</th>
            <td>{{ item.call }}</td>
            <td><div style="word-wrap: break-word; font-family: Monospace; width: 200px;">{{ item.endpoint }}</div></td>
            <td>{{ item.code }}</td>
            <td>{{ item.remaining }}</td>
            <td>
              <div style="word-wrap: break-word; font-family: Monospace; width: 100%;">
                {{ parseJSON(item.data) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import Chartkick from 'vue-chartkick';
import Chart from 'chart.js';
import moment from 'moment';
import { get, isNil, groupBy } from 'lodash-es'

Vue.use(Chartkick.use(Chart))

import { getSocket } from 'src/panel/helpers/socket';

@Component({
  components: {
    'loading': () => import('../../components/loading.vue'),
  }
})
export default class apiStats extends Vue {
  socket = getSocket('/');
  moment = moment;
  selected: string = 'helix';
  data: any[] = [];

  get selectedData() {
    return this.data.filter(o => o.api === this.selected).sort((a, b) => b.timestamp - a.timestamp)
  }

   get graphData() {
      let success = this.data.filter(o => o.api === this.selected && String(o.code).startsWith('2'))
      let errors = this.data.filter(o => o.api === this.selected && !String(o.code).startsWith('2'))

      let successPerMinute: any = {}
      let _successPerMinute = groupBy(success, o => {
        return (new Date(o.timestamp)).getHours() + ':' + (new Date(o.timestamp)).getMinutes()
      })
      for (let minute of Object.keys(_successPerMinute)) {
        let timestamp = String(new Date(_successPerMinute[minute][0].timestamp))
        successPerMinute[timestamp] = _successPerMinute[minute].length
      }

      let errorsPerMinute: any = {}
      let _errorsPerMinute = groupBy(errors, o => {
        return (new Date(o.timestamp)).getMinutes()
      })
      for (let minute of Object.keys(_errorsPerMinute)) {
        let timestamp = String(new Date(_errorsPerMinute[minute][0].timestamp))
        errorsPerMinute[timestamp] = _errorsPerMinute[minute].length
      }

      // we need to have same datas for timestamps if errors are 0
      for (let [timestamp,] of Object.entries(successPerMinute)) {
        if (!errorsPerMinute[timestamp]) errorsPerMinute[timestamp] = 0
      }

      return [
        {name: 'Success', data: successPerMinute},
        {name: 'Errors', data: errorsPerMinute},
      ]
    }

    mounted() {
      this.socket.off('api.stats').on('api.stats', (c: { code: number, remaining: number | string, data: Object}) => {
        c.code = get(c, 'code', 200) // set default to 200
        c.data = !isNil(c.data) ? JSON.stringify(c.data) : 'n/a'
        c.remaining = !isNil(c.remaining) ? c.remaining : 'n/a'

        this.data.push(c)
      })
    }

    parseJSON(data: string) {
      try {
          return JSON.stringify(JSON.parse(data), null, 2)
      } catch (e) {
        return data
      }
    }
  }
</script>