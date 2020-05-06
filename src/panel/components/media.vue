<template>
  <div :key="createdAt + id">
    <b-card
      v-if="type === 'image'"
      overlay
      :img-src="!isUploading ? b64data : ''"
      :style="{ height: isUploading ? '150px' : 'inherit'}"
    >
      <loading no-margin slow v-if="isUploading"/>
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
      <loading no-margin slow v-if="isUploading"/>
      <b-card-text v-show="b64data.length > 0" :style="{position: b64data.length === 0 ? 'absolute' : 'inherit'}">
        <audio :src="b64data" :ref="createdAt + id" controls="true" preload="metadata" style="visibility:hidden; position: absolute;" ></audio>
        <av-line canv-class="w-100" :ref-link="createdAt + id" :canv-width="1000" v-show="b64data.length > 0"></av-line>
      </b-card-text>
      <b-card-text class="absolute">
        <b-button squared variant="outline-danger" class="border-0" @click="removeMedia()" v-if="b64data.length > 0">
          <fa icon="times" class="mr-1"/> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button squared variant="outline-primary" class="border-0" v-if="b64data.length > 0" @click="$refs[createdAt + id].play()">
          <fa icon="play" class="mr-1"/> {{ translate('dialog.buttons.play') }} ({{duration}}s)
        </b-button>
        <b-button squared variant="outline-dark" class="border-0" @click="$refs['uploadAudio-' + id].click()">
          <fa icon="upload" class="mr-1"/> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          class="d-none"
          type="file"
          :ref="'uploadAudio-' + id"
          @change="filesChange($event.target.files)"
          accept="audio/*"/>
      </b-card-text>
    </b-card>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Watch } from 'vue-property-decorator';
import { v4 as uuid } from 'uuid';
import { getSocket } from '../helpers/socket';

import AudioVisual from 'vue-audio-visual'
import type { AlertMediaInterface } from 'src/bot/database/entity/alert';
Vue.use(AudioVisual)

@Component({
  components: {
    loading: () => import('./loading.vue'),
  }
})
export default class MediaForm extends Vue {
  @PropSync('media') id !: string;
  @Prop() default !: string | undefined;
  @Prop() socket !: string;
  @Prop() readonly type !: 'image' | 'audio';
  @Prop() readonly volume !: number;

  b64data: string = '';

  interval = 0;
  duration = 0;
  io: any = null;
  isUploading = false;

  createdAt = 0;

  @Watch('volume')
  @Watch('data')
  setVolume() {
    if (this.type === 'audio' && this.b64data.length === 0) {
      if (typeof this.$refs[this.id] === 'undefined') {
        console.debug(`Retrying setVolume ${this.id}`);
        return setTimeout(() => this.setVolume(), 100);
      }
      (this.$refs[this.id] as HTMLAudioElement).volume = this.volume / 100;
    }
  }

  created() {
    this.createdAt = Date.now();
    this.io = getSocket(this.socket);
    this.io.emit('alerts::getOneMedia', this.id, (err, data: AlertMediaInterface[]) => {
      console.groupCollapsed('alerts::getOneMedia ' + this.id)
      console.log(data)
      console.groupEnd();
      this.b64data = data.sort((a,b) => a.chunkNo - b.chunkNo).map(o => o.b64data).join('');
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
        this.duration = (this.$refs[this.createdAt + '' + this.id] as HTMLAudioElement).duration;
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

  fileUpload(chunks) {
    const id = uuid();
    this.isUploading = true;
    const promises: Promise<void>[] = []
    this.$nextTick(async () => {
      console.log('Uploading new media with id', id);

      for (let i = 0; i < chunks.length; i++) {
        promises.push(
          new Promise((resolve, reject) => {
            const chunk = {
              id,
              b64data: chunks[i],
              chunkNo: i
            }
            console.log('Uploading chunk#' + i, chunk)
            this.io.emit('alerts::saveMedia', [chunk], (err, data) => {
              if (err) {
                console.error(err)
                reject();
              }
              console.log('Uploaded chunk#' + i);
              resolve()
            })
          })
        )
      };

      await Promise.all(promises);
      this.id = id;
      this.isUploading = false;
    });
  }

  filesChange(file) {
    const reader = new FileReader()
    reader.onload = (async e => {
      const chunks = String(reader.result).match(/.{1,1000000}/g)
      this.fileUpload(chunks);

      await new Promise(res => {
        const checkIsUploading = () => {
          if (this.isUploading) {
            setTimeout(() => checkIsUploading(), 100);
          } else {
            res()
          }
        };
        checkIsUploading();
      })
      console.log('done')
      this.b64data = String(reader.result);
    })
    reader.readAsDataURL(file[0])
  }

  removeMedia() {
    this.b64data = ''
    this.io.emit('alerts::deleteMedia', this.id, () => {})
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