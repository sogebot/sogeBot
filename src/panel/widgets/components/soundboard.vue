<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#soundboard-main" aria-controls="home" role="tab" data-toggle="tab" title="SoundBoard">
          <font-awesome-icon icon="music" />
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link nav-dropdown" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer">
          <font-awesome-icon icon="volume-up" v-if="volume >= 65"></font-awesome-icon>
          <font-awesome-icon icon="volume-down" v-else-if="volume >= 35"></font-awesome-icon>
          <font-awesome-icon icon="volume-off" v-else></font-awesome-icon>
          <small>{{ volume }}%</small>
        </a>
        <div class="dropdown-menu" data-allow-focus aria-labelledby="dropdownMenuButton" style="padding:0; margin: 0;">
          <div class="progress" @click="setVolume">
            <div class="progress-bar" role="progressbar" :style="{ width: volume + '%'}"></div>
          </div>
        </div>
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
import { library } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faVolumeUp, faVolumeDown, faVolumeOff } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faMusic, faVolumeUp, faVolumeDown, faVolumeOff)

export default {
  props: ['socket', 'commons'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  data: function () {
    return {
      volume: 50,
      audio: null,
      sounds: []
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
  created: function () {
    this.socket.emit('getSoundBoardSounds')
    this.socket.off('soundBoardSounds').on('soundBoardSounds', sounds => this.sounds = sounds)
  },
  methods: {
    setVolume: function (ev) {
      // steps by 5
      this.volume = Math.round(Number(ev.offsetX / ev.path[1].clientWidth * 100).toFixed(0) / 5) * 5
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
