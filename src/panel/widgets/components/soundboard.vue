<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#soundboard-main" aria-controls="home" role="tab" data-toggle="tab" title="SoundBoard">
          <fa icon="music" />
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <span class="dropdown">
          <a class="nav-link nav-dropdown" id="dropdownMenuButton" data-boundary="viewPort" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer; padding: 10px">
            <fa icon="volume-up" v-if="volume >= 65"></fa>
            <fa icon="volume-down" v-else-if="volume >= 35"></fa>
            <fa icon="volume-off" v-else></fa>
            <small>{{ volume }}%</small>
          </a>
          <span class="dropdown-volume-handler">
            <div class="dropdown-menu dropdown-force-visible" data-allow-focus aria-labelledby="dropdownMenuButton" style="padding:0; margin: 0;">
              <div class="progress" @click="setVolume" style="height: 1.5rem">
                <div class="progress-bar" role="progressbar" :style="{ width: volume + '%'}"></div>
              </div>
            </div>
          </span>
        </span>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{ commons.translate('widget-title-soundboard') }}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="soundboard-main">
        <div id="soundboard-list" class="row">
          <div class="col-4" v-for="sound of sounds" :key="sound">
            <button
              class="btn btn-outline-dark soundboard-list-group-item"
              style="border: 0;padding: 0; padding-bottom: 0.4rem;"
              v-on:click="play(sound)" type="button">
              {{sound}}
            </button>
          </div>
        </div>
        <div class="clearfix"></div>
      </div>
      <!-- /MAIN -->
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['commons'],
  data: function () {
    return {
      socket: io('/widgets/soundboard', { query: "token=" + this.token }),
      volume: 50,
      audio: null,
      sounds: []
    }
  },
  mounted: function () {
    this.$emit('mounted')

    $('.dropdown').on('show.bs.dropdown', function() {
      $('body').append($('.dropdown-force-visible').css({
        position: 'absolute',
        left: $('.dropdown-volume-handler').offset().left,
        top: $('.dropdown-volume-handler').offset().top + 5
      }).detach())
    })
  },
  watch: {
    volume: function (val) {
      localStorage.setItem('/widget/soundboard/volume', JSON.stringify(val))
    }
  },
  created: function () {
    this.socket.emit('getSoundBoardSounds', (sounds) => this.sounds = sounds)
    if (localStorage.getItem('/widget/soundboard/volume')) this.volume = JSON.parse(localStorage.getItem('/widget/soundboard/volume'))
  },
  methods: {
    setVolume: function (ev) {
      // steps by 5
      const path = ev.path || (ev.composedPath && ev.composedPath());
      this.volume = Math.round(Number(ev.offsetX / path[0].clientWidth * 100).toFixed(0) / 5) * 5
    },
    play: function (sound) {
      if (!_.isNil(this.audio)) this.audio.pause()
      this.audio = new Audio('dist/soundboard/' + sound + '.mp3')
      this.audio.addEventListener('loadedmetadata', () => {
        this.audio.volume = this.volume / 100
        this.audio.play()
      })
    }
  }
}
</script>
