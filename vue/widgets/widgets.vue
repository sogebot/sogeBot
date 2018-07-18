<template>
<div class="widgets">
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
            <component :is="item.id" v-bind:socket="socket" v-bind:commons="commons" v-on:mounted="loaded = loaded + 1"></component>
          </keep-alive>
        </div>
      </div>
    </template>
  </div>
</div>
</template>

<script>
import chat from './components/chat.vue'
import cmdboard from './components/cmdboard.vue'
import commercial from './components/commercial.vue'
import customvariables from './components/customvariables.vue'
import soundboard from './components/soundboard.vue'
import twitch from './components/twitch.vue'
import twitter from './components/twitter.vue'
import ytplayer from './components/ytplayer.vue'

export default {
  props: ['items', 'commons', 'socket'],
  components: {
    chat,
    cmdboard,
    commercial,
    customvariables,
    soundboard,
    twitch,
    twitter,
    ytplayer,
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
        $('.grid-stack').gridstack(options)

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