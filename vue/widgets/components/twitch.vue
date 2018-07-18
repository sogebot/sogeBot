<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#twitch-main" aria-controls="home" role="tab" data-toggle="tab" title="Twitch Stream Monitor">
          <i class="fab fa-twitch" aria-hidden="true"></i>
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
  props: ['socket', 'commons'],
  created: function () {
    this.socket.emit('twitch.sendTwitchVideo')
    this.socket.once('twitchVideo', function (room) {
      $("#twitch-main").append(`<iframe style="width: 100%; height: 100%"
        src="${window.location.protocol}//player.twitch.tv/?channel=${room}&autoplay=true&muted=true"
        frameborder="0">
      </iframe>`)
    })
  },
  mounted: function () {
    this.$emit('mounted')
  },
}
</script>
