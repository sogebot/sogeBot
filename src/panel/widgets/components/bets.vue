<template>
  <div class="widget">
    <b-card class="border-0 h-100" no-body>
      <b-tabs pills card class="h-100">
        <template v-slot:tabs-start v-if="!popout">
          <li class="nav-item px-2 grip text-secondary align-self-center">
            <fa icon="grip-vertical" fixed-width/>
          </li>
          <li class="nav-item">
            <b-dropdown boundary="window" no-caret :text="translate('widget-title-bets')" variant="outline-primary" ref="dropdown" toggle-class="border-0">
              <b-dropdown-item>
                <a href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'bets'))" class="text-danger">
                  Remove <strong>{{translate('widget-title-bets')}}</strong> widget
                </a>
              </b-dropdown-item>
            </b-dropdown>
          </li>
        </template>

        <b-tab activ>
          <template v-slot:title>
            <fa :icon='["far", "clock"]'></fa>
            <template v-if="timer !== null">{{ timer | formatTime }}</template>
          </template>
          <b-card-text >
            <template v-if="timer !== null">
              <div v-for="(option, index) of options" :key="option.name" class="pb-2">
                <div class="progress" style="height: 35px; cursor: pointer;" @click="close(index)">
                  <div
                    class="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    :style="{width: getBetsPercentage(index)}"
                    style = "font-size: 1rem; text-shadow: 0px 0px 1px black, 0px 0px 2px black, 0px 0px 3px black, 0px 0px 4px black, 0px 0px 5px black, 0px 0px 6px black"
                  >
                    <span class="ml-1 mr-1 text-left">{{ option.name }} ({{getBets(index)}})</span>
                  </div>
                </div>
              </div>
              <div class="pb-2">
                <button class='btn btn-block btn-danger p-1 text-left' @click="close('refund')">
                  {{translate('refund') | capitalize}}
                </button>
              </div>
            </template>
            <div v-else class="alert alert-info">No bets are currently running</div>
          </b-card-text>
        </b-tab>
        <b-tab>
          <template v-slot:title>
            <fa icon='cog'></fa>
          </template>
          <b-card-text>
            <div class="input-group">
              <div class="input-group-prepend">
                  <span class="input-group-text">{{translate('gain-every-option')}}</span>
              </div>
              <input type="text" class="form-control" v-model="betPercentGain">
              <div class="input-group-append">
                  <span class="input-group-text">%</span>
              </div>
            </div>
          </b-card-text>
        </b-tab>
      </b-tabs>
    </b-card>
  </div>
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
export default {
  props: ['popout'],
  mounted: function () {
    this.$emit('mounted')
  },
  data: function () {
    return {
      socket: getSocket('/systems/bets'),
      betPercentGain: 0,

      locked: false,
      options: [],
      timer: null,
      title: '',
      interval: [],
    }
  },
  watch: {
    betPercentGain: function (value, old) {
      if (Number.isNaN(Number(value))) this.betPercentGain = old
      else {
        this.socket.emit('settings.update', {betPercentGain: value}, () => {})
      }
    }
  },
  created: function () {
    this.interval.push(
      setInterval(() => this.socket.emit('findOne', { where: { key: 'bets' } }, (err, _current) => {
        if (err) return console.error(err)
        this.socket.emit('find', { collection: 'users' }, (err, _bets) => {
          if (err) return console.error(err)
          if (Object.keys(_current).length > 0) {
            this.locked = _current.locked
            this.options = _current.options
            this.timer = Number((Number(_current.end) - new Date().getTime()) / 1000).toFixed(0)
            if (this.timer <= 0) this.timer = 0
            this.title = _current.title
          } else {
            this.title = ''
            this.timer = null,
            this.options = []
          }
          this.bets = _bets
        })
      }), 1000)
    );
    this.socket.emit('settings', (err, settings) => {
      this.betPercentGain = settings.betPercentGain
    })
  },
  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  },
  methods: {
    close: function (index) {
      this.socket.emit('close', index)
    },
    getBetsPercentage: function (index) {
      if (this.bets.length === 0) return 0

      let percentage = (100 / this.bets.length) * this.bets.filter(o => Number(o.option) === Number(index)).length + '%'
      return percentage === '0%' ? '0' : percentage
    },
    getBets: function (index) {
      return this.bets.filter(o => Number(o.option) === Number(index)).length
    }
  },
  filters: {
    capitalize: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    formatTime: function (seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [
        h,
        m > 9 ? m : (h ? '0' + m : m || '0'),
        s > 9 ? s : '0' + s,
      ].filter(a => a).join(':');
    }
  },
}
</script>
