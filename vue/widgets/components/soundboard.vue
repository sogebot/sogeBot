<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#soundboard-main" aria-controls="home" role="tab" data-toggle="tab" title="SoundBoard">
          <i class="fas fa-music" aria-hidden="true"></i>
        </a>
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
  props: ['socket', 'commons'],
  data: function () {
    return {
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
    play: function (sound) {
      if (!_.isNil(this.audio)) this.audio.pause()
      this.audio = new Audio('dist/soundboard/' + sound + '.mp3')
      this.audio.addEventListener('loadedmetadata', () => {
        this.audio.play()
      })
    }
  }
}
</script>
