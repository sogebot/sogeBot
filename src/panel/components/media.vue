<template>
  <div>
    <b-card
      v-if="type === 'image'"
      overlay
      :img-src="b64data"
    >
      <b-card-text class="absolute">
        <b-button squared variant="outline-danger" class="border-0" @click="removeMedia()" v-if="b64data.length > 0">
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
      <b-card-text v-show="b64data.length > 0" :style="{position: b64data.length === 0 ? 'absolute' : 'inherit'}">
        <audio :src="b64data" :ref="uuid" controls="true" preload="metadata" style="visibility:hidden; position: absolute;" ></audio>
        <av-line canv-class="w-100" :ref-link="uuid" :canv-width="1000" v-show="b64data.length > 0"></av-line>
      </b-card-text>
      <b-card-text class="absolute">
        <b-button squared variant="outline-danger" class="border-0" @click="removeMedia()" v-if="b64data.length > 0">
          <fa icon="times" class="mr-1"/> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button squared variant="outline-primary" class="border-0" v-if="b64data.length > 0" @click="$refs[uuid].play()">
          <fa icon="play" class="mr-1"/> {{ translate('dialog.buttons.play') }} ({{duration}}s)
        </b-button>
        <b-button squared variant="outline-dark" class="border-0" @click="$refs['uploadAudio-' + uuid].click()">
          <fa icon="upload" class="mr-1"/> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          class="d-none"
          type="file"
          :ref="'uploadAudio-' + uuid"
          @change="filesChange($event.target.files)"
          accept="audio/*"/>
      </b-card-text>
    </b-card>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import uuid from 'uuid/v4';

import AudioVisual from 'vue-audio-visual'
Vue.use(AudioVisual)

@Component({})
export default class MediaForm extends Vue {
  @Prop() media !: string;
  @Prop() default !: string | undefined;
  @Prop() socket !: string;
  @Prop() readonly type !: 'image' | 'audio';
  @Prop() readonly volume !: number;

  b64data: string = '';

  uuid: string = uuid();
  interval = 0;
  duration = 0;
  io: any = null;

  @Watch('volume')
  @Watch('data')
  setVolume() {
    if (this.type === 'audio' && this.b64data.length === 0) {
      if (typeof this.$refs[this.uuid] === 'undefined') {
        console.debug(`Retrying setVolume ${this.uuid}`);
        return setTimeout(() => this.setVolume(), 100);
      }
      (this.$refs[this.uuid] as HTMLAudioElement).volume = this.volume / 100;
    }
  }

  created() {
    this.io = io(this.socket, { query: 'token=' + this.token });
    console.log(this.io);
    this.io.emit('findOne', { collection: 'media', where: { id: this.media } }, (err, data: Registry.Alerts.AlertMedia) => {
      this.b64data = data.b64data;
    });
  }

  mounted() {
    if (this.type === 'audio') {
      this.interval = window.setInterval(() => {
        if (this.b64data.length === 0) {
          this.duration = 0;
          return;
        }
        this.setVolume();
        this.duration = (this.$refs[this.uuid] as HTMLAudioElement).duration;
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
      console.log('uploading')
      this.io.emit('update', { collection: 'media', key: 'id', items:[{ id: this.media, b64data: String(reader.result) }]}, (err, data) => {
        console.log('done')
        this.b64data = String(reader.result);
      })
    })
    reader.readAsDataURL(file[0])
  }

  removeMedia() {
    this.b64data = ''
    this.io.emit('delete', { collection: 'media', where: { id: this.media }})
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