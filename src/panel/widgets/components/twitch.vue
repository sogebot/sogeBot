<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#twitch-main" aria-controls="home" role="tab" data-toggle="tab" title="Twitch Stream Monitor">
          <fa :icon="['fab', 'twitch']" />
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a href="#" class="nav-link" title="Refresh" @click="refresh">
          <fa icon="sync-alt" v-if="!isRefreshing"/>
          <fa icon="sync-alt" spin v-else/>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{ commons.translate('widget-title-monitor') }}</h6>
      </li>
    </ul>
  </div>

  <div class="card-body">
    <!-- Tab panes -->
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" style="overflow:hidden;" id="twitch-main">
      </div>
      <!-- /MAIN -->
    </div>
  </div>
</div>
</template>

<script>
export default {
  data: function () {
    return {
      room: '',
      isRefreshing: false
    }
  },
  props: ['socket', 'commons'],
  created: function () {
    this.socket.emit('twitch.sendTwitchVideo')
    this.socket.once('twitchVideo', (room) => {
      this.room = room
      $("#twitch-main").append(`<iframe style="width: 100%; height: 100%"
        src="https://player.twitch.tv/?channel=${room}&autoplay=true&muted=true"
        frameborder="0">
      </iframe>`)
    })
  },
  methods: {
    refresh: function () {
      this.isRefreshing = true
      setTimeout(() => (this.isRefreshing = false), 2000)
      $("#twitch-main").empty()
      $("#twitch-main").append(`<iframe style="width: 100%; height: 100%"
        src="https://player.twitch.tv/?channel=${this.room}&autoplay=true&muted=true"
        frameborder="0">
      </iframe>`)
    },
  },
  mounted: function () {
    this.$emit('mounted')
  },
}
</script>
