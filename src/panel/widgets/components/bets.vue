<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-bets')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'bets'))" class="text-danger")
                    | Remove <strong>{{translate('widget-title-bets')}}</strong> widget
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-bets') }}

        b-tab(active)
          template(v-slot:title)
            fa(:icon='["far", "clock"]' fixed-width)
            template(v-if="!arePointsGiven") {{ timer | formatTime }}
          b-card-text
            template(v-if="!arePointsGiven")
              div(v-for="(option, index) of options" :key="option").pb-2
                div(style="height: 35px; cursor: pointer;" @click="close(index)").progress
                  div(
                    class="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    :style="{width: getBetsPercentage(index)}"
                    style = "font-size: 1rem; text-shadow: 0px 0px 1px black, 0px 0px 2px black, 0px 0px 3px black, 0px 0px 4px black, 0px 0px 5px black, 0px 0px 6px black"
                  )
                    span.ml-1.mr-1.text-left {{ option }} ({{ getBets(index) }})
              div.pb-2
                button(@click="close('refund')").btn.btn-block.btn-danger.p-1.text-left
                  | {{ translate('refund') | capitalize }}
            div(v-else).alert.alert-info No bets are currently running
        b-tab
          template v-slot:title
            fa(icon='cog')
          b-card-text
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('gain-every-option')}}
              input(type="text" v-model="betPercentGain").form-control
              div.input-group-append
                span.input-group-text %
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { EventBus } from 'src/panel/helpers/event-bus';

export default {
  props: ['popout', 'nodrag'],
  data: function () {
    return {
      EventBus,
      socket: getSocket('/systems/bets'),
      betPercentGain: 0,

      locked: false,
      options: [],
      timer: null,
      title: '',
      arePointsGiven: false,
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
      setInterval(() => this.socket.emit('bets::getCurrentBet', (err, _current) => {
        if (err) return console.error(err)
        if (_current) {
          this.locked = _current.isLocked
          this.options = _current.options
          this.timer = Number((Number(_current.endedAt) - new Date().getTime()) / 1000).toFixed(0)
          if (this.timer <= 0) this.timer = 0
          this.title = _current.title
          this.bets = _current.participations
          this.arePointsGiven = _current.arePointsGiven
        } else {
          this.title = ''
          this.arePointsGiven = true;
          this.timer = null,
          this.options = []
        }
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
      this.socket.emit('bets::close', index)
    },
    getBetsPercentage: function (index) {
      if (this.bets.length === 0) return 0

      let percentage = (100 / this.bets.length) * this.bets.filter(o => Number(o.optionIdx) === Number(index)).length + '%'
      return percentage === '0%' ? '0' : percentage
    },
    getBets: function (index) {
      return this.bets.filter(o => Number(o.optionIdx) === Number(index)).length
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
