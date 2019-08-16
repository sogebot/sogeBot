<template>
  <div>
    <b-card
      v-if="type === 'image'"
      overlay
      :img-src="data"
    >
      <b-card-text class="absolute">
        <b-button squared variant="outline-danger" class="border-0" @click="data = ''" v-if="data.length > 0">
          <fa icon="times" class="mr-1"/> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button squared variant="outline-dark" class="border-0" @click="$refs.uploadImage.click()">
          <fa icon="upload" class="mr-1"/> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          class="d-none"
          type="file"
          ref="uploadImage"
          @change="filesChange($event.target.files)"
          accept="image/*"/>
      </b-card-text>
    </b-card>
    <b-card v-else-if="type === 'audio'">
      <b-card-text v-show="data.length > 0" :style="{position: data.length === 0 ? 'absolute' : 'inherit'}">
        <audio :src="data" ref="audio" controls="true" preload="metadata" style="visibility:hidden; position: absolute;" ></audio>
        <av-line canv-class="w-100" ref-link="audio" :canv-width="1000" v-show="data.length > 0"></av-line>
      </b-card-text>
      <b-card-text class="absolute">
        <b-button squared variant="outline-danger" class="border-0" @click="data = ''" v-if="data.length > 0">
          <fa icon="times" class="mr-1"/> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button squared variant="outline-primary" class="border-0" v-if="data.length > 0" @click="$refs.audio.play()">
          <fa icon="play" class="mr-1"/> {{ translate('dialog.buttons.play') }} ({{duration}}s)
        </b-button>
        <b-button squared variant="outline-dark" class="border-0" @click="$refs.uploadAudio.click()">
          <fa icon="upload" class="mr-1"/> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          class="d-none"
          type="file"
          ref="uploadAudio"
          @change="filesChange($event.target.files)"
          accept="audio/*"/>
      </b-card-text>
    </b-card>
  </div>
</template>

<script lang="ts">
import { Vue, Component, PropSync, Prop, Watch } from 'vue-property-decorator';

import AudioVisual from 'vue-audio-visual'
Vue.use(AudioVisual)

@Component({})
export default class MediaForm extends Vue {
  @PropSync('media') data !: string;
  @Prop() readonly type !: 'image' | 'audio';
  @Prop() readonly volume !: number;

  interval = 0;
  duration = 0

  @Watch('volume')
  @Watch('data')
  setVolume() {
    if (this.type === 'audio' && this.data.length > 0) {
      (this.$refs.audio as HTMLAudioElement).volume = this.volume / 100;
    }
  }

  mounted() {
    if (this.type === 'audio') {
      this.interval = window.setInterval(() => {
        if (this.data.length === 0) {
          this.duration = 0;
          return;
        }
        this.setVolume();
        this.duration = (this.$refs.audio as HTMLAudioElement).duration;
        if (isNaN(this.duration)) {
          this.duration = 0;
        } else {
          this.duration = Math.floor(this.duration * 10) / 10;
        }
      }, 500)
    };
  }

  beforeDestroy() {
    clearInterval(this.interval)
  }

  filesChange(file) {
    const reader = new FileReader()
    reader.onload = (e => {
      this.data = String(reader.result);
    })
    reader.readAsDataURL(file[0])
  }
}
</script>

<style scoped>
  .card-img {
    width: max-content !important;
    max-width: 100%;
    padding-bottom: 2rem;
  }
  .card-text.absolute {
    position: absolute;
    bottom: 0.15rem;
    left: 0.15rem;
  }
  .card {
    min-height: 2.5rem;
  }
</style>