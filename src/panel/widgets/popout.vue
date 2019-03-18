<template>
  <component :is="widget" v-bind:socket="socket" v-bind:commons="commons" :popout="true"></component>
</template>

<script>
export default {
  props: ['items', 'commons', 'socket', 'page'],
  components: {
    bets: () => import('./components/bets.vue'),
    chat: () => import('./components/chat.vue'),
    cmdboard: () => import('./components/cmdboard.vue'),
    commercial: () => import('./components/commercial.vue'),
    customvariables: () => import('./components/customvariables.vue'),
    eventlist: () => import('./components/eventlist.vue'),
    join: () => import('./components/join.vue'),
    part: () => import('./components/part.vue'),
    queue: () => import('./components/queue.vue'),
    raffles: () => import('./components/raffles.vue'),
    soundboard: () => import('./components/soundboard.vue'),
    spotify: () => import('./components/spotify.vue'),
    twitch: () => import('./components/twitch.vue'),
    twitter: () => import('./components/twitter.vue'),
    widgetCreate: () => import('./components/widget_create.vue'),
    ytplayer: () => import('./components/ytplayer.vue'),
    social: () => import('./components/social.vue'),
  },
  data: function () {
    return {
      widget: null
    }
  },
  mounted: function () {
    this.page('/popout/', p => {
      let hash = p.hash.length === 0 || p.hash === '/' ? 'dashboard' : p.hash
      if (hash.startsWith('/')) hash = hash.replace('/', '')
      this.widget = hash
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