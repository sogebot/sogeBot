<template>
<div class="widgets">
  <div>
    <div class="grid-stack" v-if="show">
      <template v-for="item in items">
        <div :key="item.id"
          v-bind:id="'widget-' + item.id"
          v-bind:data-gs-x="item.position.x"
          v-bind:data-gs-y="item.position.y"
          v-bind:data-gs-width="item.size.width"
          v-bind:data-gs-height="item.size.height"
          class="grid-stack-item"
        >
          <div class="grid-stack-item-content">
            <keep-alive>
              <component :is="item.id" :token="token" :socket="socket" :commons="commons" @mounted="loaded = loaded + 1" :popout="false"></component>
            </keep-alive>
          </div>
        </div>
      </template>
    </div>
  </div>
  <div class="w-100"></div>
  <widget-create v-bind:socket="socket" v-bind:commons="commons" class="pt-4"></widget-create>
</div>
</template>

<script>
import bets from './components/bets.vue'
import chat from './components/chat.vue'
import cmdboard from './components/cmdboard.vue'
import commercial from './components/commercial.vue'
import customvariables from './components/customvariables.vue'
import eventlist from './components/eventlist.vue'
import join from './components/join.vue'
import part from './components/part.vue'
import queue from './components/queue.vue'
import raffles from './components/raffles.vue'
import soundboard from './components/soundboard.vue'
import twitch from './components/twitch.vue'
import twitter from './components/twitter.vue'
import widgetCreate from './components/widget_create.vue'
import ytplayer from './components/ytplayer.vue'

export default {
  props: ['items', 'commons', 'socket', 'token'],
  components: {
    bets,
    chat,
    cmdboard,
    commercial,
    customvariables,
    eventlist,
    join,
    part,
    queue,
    raffles,
    soundboard,
    twitch,
    twitter,
    widgetCreate,
    ytplayer
  },
  data: function () {
    return {
      show: true,
      loaded: 0
    }
  },
  watch: {
    items: function (value, old) {
      if (value.length > old.length) {
        this.loaded = 0
        this.show = false
        this.$nextTick(function () { this.show = true })
      }
    },
    loaded: function (value) {
      if (value === this.items.length) this.initGridStack()
    }
  },
  methods: {
    initGridStack: function () {
      const options = { cellHeight: 42, verticalMargin: 10, removable: true, removeTimeout: 100, handleClass: 'card-header' }
      this.$nextTick(function () {
        if ($('.grid-stack').length === 0) return
        $('.grid-stack').gridstack(options)
        $('.grid-stack-item').draggable({cancel: "div.not-draggable" });

        $('.grid-stack').off('change').on('change', () => {
          let widgets = []
          for (let item of $('.grid-stack-item')) {
            widgets.push({
              id: $(item).attr('id').split('-')[1],
              position: {
                x: $(item).attr('data-gs-x'),
                y: $(item).attr('data-gs-y')
              },
              size: {
                height: $(item).attr('data-gs-height'),
                width: $(item).attr('data-gs-width')
              }
            })
          }
          this.socket.emit('updateWidgets', widgets)
        })
      })
    }
  }
}
</script>