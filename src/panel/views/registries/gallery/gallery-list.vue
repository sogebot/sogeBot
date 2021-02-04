<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.gallery') }}
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <form enctype="multipart/form-data" novalidate>
          <label class="custom-file-upload" for="uploadImageInput">
            <button type="button" class="btn btn-primary" :disabled="state.uploading === $state.progress" @click="$refs.uploadFileInput.click()">
              <template v-if="state.uploading === $state.progress">
                  <fa icon="circle-notch" fixed-width spin></fa>
                  {{ translate('dialog.buttons.upload.progress') }}</template>
                <template v-else>
                  <fa icon="upload" fixed-width></fa>
                  {{ translate('dialog.buttons.upload.idle') }}</template>
            </button>
          </label>
            <input
              class="d-none input-file"
              type="file"
              ref="uploadFileInput"
              :disabled="state.uploading === $state.progress"
              @change="filesChange($event.target.files)"
              multiple
              accept="image/*, video/mp4, audio/*"/>
        </form>
      </template>
      <template v-slot:right>
        <b-button variant="danger" v-if="markToDeleteIdx.length > 0" @click="remove">
          Delete {{ markToDeleteIdx.length }} item(s)
        </b-button>

        <button class="btn btn-primary border-0" :class="[exclude.includes('audio') ? 'btn-secondary' : 'btn-primary']" v-on:click="toggle('audio')">
          <fa :icon="['far', exclude.includes('audio') ? 'square' : 'check-square']" fixed-width></fa> Audio
        </button>
        <button class="btn btn-primary border-0" :class="[exclude.includes('video') ? 'btn-secondary' : 'btn-primary']" v-on:click="toggle('video')">
          <fa :icon="['far', exclude.includes('video') ? 'square' : 'check-square']" fixed-width></fa> Video
        </button>
        <button class="btn btn-primary border-0" :class="[exclude.includes('images') ? 'btn-secondary' : 'btn-primary']" v-on:click="toggle('images')">
          <fa :icon="['far', exclude.includes('images') ? 'square' : 'check-square']" fixed-width></fa> Images
        </button>
      </template>
    </panel>

    <loading v-if="state.loading === $state.progress" />
    <div class="card-deck mb-3" v-else-if="filtered.length > 0" v-for="(chunk, index) of chunk(filtered, itemCountPerRow)" :key="'chunk-' + index">
      <b-card no-body :bg-variant="markToDeleteIdx.includes(item.id) ? 'info' : undefined" :text-variant="markToDeleteIdx.includes(item.id) ? 'white' : undefined" v-for="item of chunk" :key="item.id">
        <b-card-body class="p-0">
          <b-card-title>
            <a v-bind:href="'/gallery/'+ item.id" class="btn btn-outline-dark p-3 border-0 w-100" target="_blank"><fa icon="link"></fa> {{ item.name || item.id }}</a>
          </b-card-title>
          <b-card-text>
            <img class="w-100" :src="'/gallery/'+ item.id" v-if="item.type.includes('png') || item.type.includes('jpg') || item.type.includes('jpeg') || item.type.includes('gif')">
            <video class="w-100" v-if="item.type.includes('mp4')" controls>
              <source :type="item.type" :src="'/gallery/'+ item.id">
            </video>
            <audio class="w-100" v-if="item.type.includes('audio')" controls>
              <source :type="item.type" :src="'/gallery/'+ item.id">
            </audio>
          </b-card-text>
        </b-card-body>

        <b-card-footer class="p-0">
          <button-with-icon :class="markToDeleteIdx.includes(item.id) ? 'btn-info' : 'btn-danger'" class="btn-reverse w-100" icon="trash" @click="toggleMarkResponse(item.id)">
            {{ translate('dialog.buttons.delete') }}
          </button-with-icon>
        </b-card-footer>
      </b-card>

      <!-- add empty invisible cards if chunk is < 3-->
      <div class="card" v-for="index in (itemCountPerRow - chunk.length)" style="visibility: hidden" :key="'empty-' + index"></div>
    </div>
  </b-container>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';
import { faLink, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  computed, defineComponent, onMounted, onUnmounted, ref, watch, 
} from '@vue/composition-api';
import { chunk, xor } from 'lodash-es';
import { v4 as uuid } from 'uuid';

library.add(faLink, faTrash, faCheckSquare, faSquare);

import type { GalleryInterface } from 'src/bot/database/entity/gallery';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { getSocket } from 'src/panel/helpers/socket';
import translate from 'src/panel/helpers/translate';

const socket = getSocket('/overlays/gallery');
let interval = 0;

export default defineComponent({
  components: { loading: () => import('src/panel/components/loading.vue') },
  setup() {
    const domWidth = ref(document.body.clientWidth);

    const items = ref([] as GalleryInterface[]);
    const exclude = ref([] as any[]);
    const uploadedFiles = ref(0);
    const isUploadingNum = ref(0);
    const markToDeleteIdx = ref([] as string[]);

    const state = ref({
      loading:   ButtonStates.progress,
      uploading: ButtonStates.idle,
    } as {
      uploading: number;
      loading: number;
    });

    const filtered = computed(() => {
      return items.value.filter(o => {
        const isVideoIncluded = !(exclude.value.includes('video') && o.type.includes('video'));
        const isImageIncluded = !(exclude.value.includes('images') && o.type.includes('image'));
        const isAudioIncluded = !(exclude.value.includes('audio') && o.type.includes('audio'));
        return isVideoIncluded && isImageIncluded && isAudioIncluded;
      });
    });
    const itemCountPerRow = computed(() => {
      if (domWidth.value > 1400) {
        return 6;
      }
      if (domWidth.value > 1300) {
        return 5;
      }
      if (domWidth.value > 1100) {
        return 4;
      } else if (domWidth.value > 800) {
        return 3;
      } else if (domWidth.value > 600) {
        return 2;
      } else {
        return 4;
      }
    });

    onMounted(() => {
      refresh();
      interval = window.setInterval(() => {
        domWidth.value = document.body.clientWidth;
      }, 1000);
    });
    onUnmounted(() => {
      clearInterval(interval);
    });

    watch(uploadedFiles, (val: number) => {
      if (isUploadingNum.value === val) {
        state.value.uploading = ButtonStates.idle;
      } else {
        state.value.uploading = ButtonStates.progress;
      }
    });

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, _items: GalleryInterface[]) => {
        console.debug('Loaded', _items);
        items.value = _items;
        state.value.loading = ButtonStates.success;
      });
    };
    const toggle = (type: GalleryInterface['type']) => {
      if (exclude.value.includes(type)) {
        exclude.value = exclude.value.filter(o => o !== type);
      } else {
        exclude.value.push(type);
      }
    };

    const remove = () => {
      for (const id of markToDeleteIdx.value) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            console.error(err);
          } else {
            items.value = items.value.filter(o => o.id != id);
          }
        });
      }
      markToDeleteIdx.value = [];
    };

    const toggleMarkResponse = (index: string) => {
      markToDeleteIdx.value = xor(markToDeleteIdx.value, [index]);
    };

    const filesChange = (files: HTMLInputElement['files']) => {
      if (!files) {
        return;
      }
      state.value.uploading = ButtonStates.progress;
      isUploadingNum.value = files.length;
      uploadedFiles.value = 0;

      for (let i = 0, l = files.length; i < l; i++) {
        const reader = new FileReader();
        reader.onload = (async (e: any) => {
          const id = uuid();
          const chunks = String(reader.result).match(/.{1,500000}/g);
          if (!chunks) {
            return;
          }
          for (let j = 0; j < chunks.length; j++) {
            // upload one by one to have full file
            await new Promise(resolve => {
              console.debug(`upload::${files[i].name}::chunk::${j}`);
              socket.emit('gallery::upload', [files[i].name, {
                id,
                b64data: chunks[j],
              }], (err: string | null) => {
                if (err) {
                  return error(err);
                }
                console.debug(`done::${files[i].name}::chunk::${j}`);
                resolve(true);
              });
            });
          }
          uploadedFiles.value++;
          socket.emit('generic::getOne', id, (err: string | null, _item: GalleryInterface) => {
            console.debug('Loaded', items);
            items.value.push(_item);
          });
        });
        reader.readAsDataURL(files[i]);
      }
    };

    return {
      domWidth,
      state,
      items,
      exclude,
      filtered,
      itemCountPerRow,
      toggle,
      remove,
      filesChange,
      toggleMarkResponse,
      markToDeleteIdx,

      isUploadingNum,
      uploadedFiles,

      chunk,
      translate,
    };
  },
});
</script>
