<template>
  <component :is="widget" v-bind:socket="socket" v-bind:commons="commons" :popout="true"></component>
</template>

<script>
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

export default {
  props: ['items', 'commons', 'socket', 'page'],
  components: {
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
    twitter
  },
  data: function () {
    return {
      widget: null
    }
  },
  mounted: function () {
    this.page('/popout/', p => {
      this.widget = p.hash.length === 0 ? 'dashboard' : p.hash
      $('title').text(`${name.toUpperCase()} POPOUT - ${this.widget}`)
    })
    this.page({ popstate:true })

    // allow focus on dropdowns with data-allow-focus
    $(document).on("click", "[data-allow-focus]", function(e) {
      e.preventDefault()
      e.stopPropagation();
    });
  }
}
</script>