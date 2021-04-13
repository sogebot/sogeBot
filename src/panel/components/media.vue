<template>
  <div :key="createdAt + media">
    <b-card
      v-if="type === 'image' && b64data.startsWith('data:video')"
      :style="{ height: isUploading ? '150px' : 'inherit'}"
    >
      <loading
        v-if="isUploading"
        no-margin
        slow
      />
      <video
        ref="video"
        class="w-100 pb-3"
        style="max-width:500px;"
      >
        <source
          :src="b64data"
          type="video/webm"
        >
        Your browser does not support the video tag.
      </video>
      <b-card-text class="absolute">
        <b-button
          v-if="b64data.length > 0"
          squared
          variant="outline-danger"
          class="border-0"
          @click="removeMedia()"
        >
          <fa
            icon="times"
            class="mr-1"
          /> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button
          v-if="b64data.length > 0"
          squared
          variant="outline-primary"
          class="border-0"
          @click="isPlaying ? stop() : play()"
        >
          <fa
            :icon="isPlaying ? 'stop' : 'play'"
            class="mr-1"
          /> {{ translate(isPlaying ? 'dialog.buttons.stop' : 'dialog.buttons.play') }} ({{ duration }}s)
        </b-button>
        <b-button
          squared
          variant="outline-dark"
          class="border-0"
          @click="$refs.uploadImage.click()"
        >
          <fa
            icon="upload"
            class="mr-1"
          /> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          ref="uploadImage"
          class="d-none"
          type="file"
          accept="image/*, video/webm"
          @change="filesChange($event.target.files)"
        >
      </b-card-text>
    </b-card>
    <b-card
      v-else-if="type === 'image'"
      overlay
      :img-src="!isUploading ? b64data : ''"
      :style="{ height: isUploading ? '150px' : 'inherit'}"
    >
      <loading
        v-if="isUploading"
        no-margin
        slow
      />
      <b-card-text class="absolute">
        <b-button
          v-if="b64data.length > 0"
          squared
          variant="outline-danger"
          class="border-0"
          @click="removeMedia()"
        >
          <fa
            icon="times"
            class="mr-1"
          /> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button
          squared
          variant="outline-dark"
          class="border-0"
          @click="$refs.uploadImage.click()"
        >
          <fa
            icon="upload"
            class="mr-1"
          /> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          ref="uploadImage"
          class="d-none"
          type="file"
          accept="image/*, video/webm"
          @change="filesChange($event.target.files)"
        >
      </b-card-text>
    </b-card>
    <b-card v-else-if="type === 'audio'">
      <loading
        v-if="isUploading"
        no-margin
        slow
      />
      <b-card-text
        v-show="b64data.length > 0"
        :style="{position: b64data.length === 0 ? 'absolute' : 'inherit'}"
      >
        <audio
          ref="audio"
          :src="b64data"
          controls="true"
          preload="metadata"
          style="visibility:hidden; position: absolute;"
        />
        <av-line
          v-show="b64data.length > 0"
          canv-class="w-100"
          ref-link="audio"
          :canv-width="1000"
        />
      </b-card-text>
      <b-card-text class="absolute">
        <b-button
          v-if="b64data.length > 0"
          squared
          variant="outline-danger"
          class="border-0"
          @click="removeMedia()"
        >
          <fa
            icon="times"
            class="mr-1"
          /> {{ translate('dialog.buttons.delete') }}
        </b-button>
        <b-button
          v-if="b64data.length > 0"
          squared
          variant="outline-primary"
          class="border-0"
          @click="isPlaying ? stop() : play()"
        >
          <fa
            :icon="isPlaying ? 'stop' : 'play'"
            class="mr-1"
          /> {{ translate(isPlaying ? 'dialog.buttons.stop' : 'dialog.buttons.play') }} ({{ duration }}s)
        </b-button>
        <b-button
          squared
          variant="outline-dark"
          class="border-0"
          @click="$refs['uploadAudio-' + media].click()"
        >
          <fa
            icon="upload"
            class="mr-1"
          /> {{ translate('dialog.buttons.upload.idle') }}
        </b-button>
        <input
          :ref="'uploadAudio-' + media"
          class="d-none"
          type="file"
          accept="audio/*"
          @change="filesChange($event.target.files)"
        >
      </b-card-text>
    </b-card>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, onUnmounted, ref,
} from '@vue/composition-api';
import type  { Ref } from '@vue/composition-api';
import { Socket } from 'socket.io-client';
import { v4 as uuid } from 'uuid';
import Vue from 'vue';
import AudioVisual from 'vue-audio-visual';

import type { AlertMediaInterface } from 'src/bot/database/entity/alert';

Vue.use(AudioVisual);

interface Props {
  media: string; default?: string; socket: string; type: 'image' | 'audio'; volume: number;
}

export default defineComponent({
  components: { loading: () => import('./loading.vue') },
  props:      {
    media:   String,
    default: String,
    socket:  String,
    type:    String,
    volume:  Number,
  },
  setup(props: Props, context) {
    const io: Socket = getSocket(props.socket);
    let interval = 0;

    const b64data = ref('');
    const duration = ref(0);
    const isUploading = ref(false);
    const createdAt = ref(0);
    const isPlaying = ref(false);

    // template refs
    const audio: Ref<null | HTMLAudioElement> = ref(null);
    const video: Ref<null | HTMLVideoElement>  = ref(null);

    const play = () => {
      audio.value?.play();
      video.value?.play();
    };

    const stop = () => {
      if (audio.value) {
        audio.value.pause();
        audio.value.currentTime = 0;
      }
      if (video.value) {
        video.value.pause();
        video.value.currentTime = 0;
      }
    };

    const isPlayingSetter = () => {
      if (audio.value) {
        isPlaying.value = !audio.value.paused;
      } else if (video.value) {
        isPlaying.value = !video.value.paused;
      }
    };

    const setDuration = () => {
      if (audio.value) {
        duration.value = audio.value.duration;
        if (isNaN(duration.value)) {
          duration.value = 0;
        } else {
          duration.value = Math.floor(duration.value * 10) / 10;
        }
      }
      if (video.value) {
        duration.value = video.value.duration;
        if (isNaN(duration.value)) {
          duration.value = 0;
        } else {
          duration.value = Math.floor(duration.value * 10) / 10;
        }
      }
    };

    const setVolume = () => {
      if ((props.type === 'audio' || (props.type === 'image' && b64data.value.startsWith('data:video/webm'))) && b64data.value.length > 0) {
        if (props.type === 'audio') {
          if (typeof audio.value === 'undefined') {
            console.debug(`Retrying setVolume ${props.media}`);
            setTimeout(() => setVolume(), 100);
            return;
          }
          if (audio.value) {
            audio.value.volume = props.volume / 100;
          }
        } else {
          if (typeof video.value === 'undefined') {
            console.debug(`Retrying setVolume ${props.media}`);
            setTimeout(() => setVolume(), 100);
            return;
          }
          if (video.value) {
            video.value.volume = props.volume / 100;
          }
        }
      }
    };

    const startInterval = () => {
      interval = window.setInterval(() => {
        if (b64data.value.length === 0) {
          duration.value = 0;
          return;
        }
        setVolume();
        isPlayingSetter();
        setDuration();
      }, 100);
    };

    const removeMedia = () => {
      b64data.value = '';
      io.emit('alerts::deleteMedia', props.media, () => {
        return;
      });
    };

    const fileUpload = (chunks: RegExpMatchArray | null) => {
      if (!chunks) {
        return;
      }
      const id = uuid();
      isUploading.value = true;
      const promises: Promise<void>[] = [];
      context.root.$nextTick(async () => {
        console.log('Uploading new media with id', id);

        for (let i = 0; i < chunks.length; i++) {
          promises.push(
            new Promise<void>((resolve, reject) => {
              const chunk = {
                id,
                b64data: chunks[i],
                chunkNo: i,
              };
              console.log('Uploading chunk#' + i, chunk);
              io.emit('alerts::saveMedia', [chunk], (err: string | null) => {
                if (err) {
                  console.error(err);
                  reject();
                }
                console.log('Uploaded chunk#' + i);
                resolve();
              });
            }),
          );
        }

        await Promise.all(promises);
        context.emit('update:media', id);
        isUploading.value = false;
      });
    };

    const filesChange = (file: HTMLInputElement['files']) => {
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (async e => {
        const chunks = String(reader.result).match(/.{1,500000}/g);
        fileUpload(chunks);

        await new Promise<void>(res => {
          const checkIsUploading = () => {
            if (isUploading.value) {
              setTimeout(() => checkIsUploading(), 500);
            } else {
              res();
            }
          };
          checkIsUploading();
        });
        console.log('done');
        b64data.value = String(reader.result);
      });
      reader.readAsDataURL(file[0]);
    };

    onMounted(() => {
      createdAt.value = Date.now();
      io.emit('alerts::getOneMedia', props.media, (err: string| null, data: AlertMediaInterface[]) => {
        if (err) {
          return console.error(err);
        }
        console.groupCollapsed('alerts::getOneMedia ' + props.media);
        console.log(data);
        console.groupEnd();
        b64data.value = data.sort((a,b) => a.chunkNo - b.chunkNo).map(o => o.b64data).join('');
        startInterval();
      });
    });
    onUnmounted(() => clearInterval(interval));

    return {
      b64data, duration, isUploading, createdAt, audio, video,
      removeMedia, play, filesChange, translate, isPlaying, stop,
    };
  },
});
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