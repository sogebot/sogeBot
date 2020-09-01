<template>
  <div :key="createdAt + media">
    <b-card
      v-if="type === 'image' && b64data.startsWith('data:video')"
      :style="{ height: isUploading ? '150px' : 'inherit'}"
    >
      <loading no-margin slow v-if="isUploading"/>
      <video ref="video" class="w-100 pb-3" style="max-width:500px;">
        <source :src="b64data" type="video/webm">
        Your browser does not support the video tag.
      </video>
      <b-card-text class="absolute">
        <b-button squared variant="outline-danger" class="border-0" @click="removeMedia()" v-if="b64data.length > 0">
          <fa icon="times" class="mr-1"/> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button squared variant="outline-primary" class="border-0" v-if="b64data.length > 0" @click="play()">
          <fa icon="play" class="mr-1"/> {{ translate('dialog.buttons.play') }} ({{duration}}s)
        </b-button>
        <b-button squared variant="outline-dark" class="border-0" @click="$refs.uploadImage.click()">
          <fa icon="upload" class="mr-1"/> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          class="d-none"
          type="file"
          ref="uploadImage"
          @change="filesChange($event.target.files)"
          accept="image/*, video/webm"/>
      </b-card-text>
    </b-card>
    <b-card
      v-else-if="type === 'image'"
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
          accept="image/*, video/webm"/>
      </b-card-text>
    </b-card>
    <b-card v-else-if="type === 'audio'">
      <loading no-margin slow v-if="isUploading"/>
      <b-card-text v-show="b64data.length > 0" :style="{position: b64data.length === 0 ? 'absolute' : 'inherit'}">
        <audio :src="b64data" ref="audio" controls="true" preload="metadata" style="visibility:hidden; position: absolute;" ></audio>
        <av-line canv-class="w-100" ref-link="audio" :canv-width="1000" v-show="b64data.length > 0"></av-line>
      </b-card-text>
      <b-card-text class="absolute">
        <b-button squared variant="outline-danger" class="border-0" @click="removeMedia()" v-if="b64data.length > 0">
          <fa icon="times" class="mr-1"/> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button squared variant="outline-primary" class="border-0" v-if="b64data.length > 0" @click="play()">
          <fa icon="play" class="mr-1"/> {{ translate('dialog.buttons.play') }} ({{duration}}s)
        </b-button>
        <b-button squared variant="outline-dark" class="border-0" @click="$refs['uploadAudio-' + media].click()">
          <fa icon="upload" class="mr-1"/> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          class="d-none"
          type="file"
          :ref="'uploadAudio-' + media"
          @change="filesChange($event.target.files)"
          accept="audio/*"/>
      </b-card-text>
    </b-card>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import AudioVisual from 'vue-audio-visual'

Vue.use(AudioVisual);

import { defineComponent, onMounted, onUnmounted, ref } from '@vue/composition-api'
import type  { Ref } from '@vue/composition-api'
import { v4 as uuid } from 'uuid';

import { getSocket } from '../helpers/socket';
import type { AlertMediaInterface } from 'src/bot/database/entity/alert';

interface Props {
  media: string; default?: string; socket: string; type: 'image' | 'audio'; volume: number;
}

export default defineComponent({
  components: {
    loading: () => import('./loading.vue'),
  },
  props: {
    media: String,
    default: String,
    socket: String,
    type: String,
    volume: Number,
  },
  setup(props: Props, context) {
    let io: null | SocketIOClient.Socket = null;
    let interval = 0

    const b64data = ref('');
    const duration = ref(0);
    const isUploading = ref(false);
    const createdAt = ref(0);

    // template refs
    const audio: Ref<null | HTMLAudioElement> = ref(null);
    const video: Ref<null | HTMLVideoElement>  = ref(null);

    const play = () => {
      audio.value?.play();
      video.value?.play();
    };

    const setVolume = () => {
      if ((props.type === 'audio' || (props.type === 'image' && b64data.value.startsWith('data:video/webm'))) && b64data.value.length > 0) {
        if (typeof audio.value === 'undefined') {
          console.debug(`Retrying setVolume ${props.media}`);
          setTimeout(() => setVolume(), 100);
          return;
        }
        if (audio.value) {
          audio.value.volume = props.volume / 100;
        }
      }
    }

    const startInterval = () => {
      interval = window.setInterval(() => {
        if (b64data.value.length === 0) {
          duration.value = 0;
          return;
        }
        setVolume();
        if (audio.value) {
          duration.value = audio.value.duration;
          if (isNaN(duration.value)) {
            duration.value = 0;
          } else {
            duration.value = Math.floor(duration.value * 10) / 10;
          }
        }
      }, 500)
    }

    const removeMedia = () => {
      b64data.value = ''
      io?.emit('alerts::deleteMedia', props.media, () => {})
    }

    const fileUpload = (chunks: RegExpMatchArray | null) => {
      if (!chunks) {
        return;
      }
      const id = uuid();
      isUploading.value = true;
      const promises: Promise<void>[] = []
      context.root.$nextTick(async () => {
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
              io?.emit('alerts::saveMedia', [chunk], (err: string | null) => {
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
        context.emit('update:media', id);
        isUploading.value = false;
      });
    }

    const filesChange = (file: HTMLInputElement['files']) => {
      if (!file) {
        return;
      }

      const reader = new FileReader()
      reader.onload = (async e => {
        const chunks = String(reader.result).match(/.{1,1000000}/g)
        fileUpload(chunks);

        await new Promise(res => {
          const checkIsUploading = () => {
            if (isUploading.value) {
              setTimeout(() => checkIsUploading(), 100);
            } else {
              res()
            }
          };
          checkIsUploading();
        })
        console.log('done')
        b64data.value = String(reader.result);
      })
      reader.readAsDataURL(file[0])
    }

    onMounted(() => {
      createdAt.value = Date.now();
      io = getSocket(props.socket);
      io.emit('alerts::getOneMedia', props.media, (err: string| null, data: AlertMediaInterface[]) => {
        if (err) {
          return console.error(err);
        }
        console.groupCollapsed('alerts::getOneMedia ' + props.media)
        console.log(data)
        console.groupEnd();
        b64data.value = data.sort((a,b) => a.chunkNo - b.chunkNo).map(o => o.b64data).join('');
        startInterval();
      });
    });
    onUnmounted(() => clearInterval(interval))

    return {
      b64data, duration, isUploading, createdAt, audio, video,
      removeMedia, play, filesChange
    }
  }
})
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