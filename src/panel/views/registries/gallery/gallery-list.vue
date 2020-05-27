<template>
  <b-container fluid ref="window">
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
              accept="image/*, video/mp4, audio/*"/>
        </form>
      </template>
      <template v-slot:right>
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
      <div class="card" v-for="item of chunk" :key="item.id">
        <div class="card-body border-top p-0 text-right" style="flex: 0 1 auto;">
          <a v-bind:href="'/gallery/'+ item.id" class="btn btn-outline-dark p-3 border-0 w-100" target="_blank"><fa icon="link"></fa> {{ item.name || item.id }}</a>
        </div>
        <div class="card-body border-top p-0 text-right" style="flex: 1 1 auto;">
          <img class="w-100" :src="'/gallery/'+ item.id" v-if="item.type.includes('png') || item.type.includes('jpg') || item.type.includes('jpeg') || item.type.includes('gif')">
          <video class="w-100" v-if="item.type.includes('mp4')" controls>
            <source :type="item.type" :src="'/gallery/'+ item.id">
          </video>
          <audio class="w-100" v-if="item.type.includes('audio')" controls>
            <source :type="item.type" :src="'/gallery/'+ item.id">
          </audio>
        </div>

        <div class="card-footer p-0">
          <hold-button @trigger="remove(item.id)" icon="trash" class="btn-danger btn-reverse w-100">
              <template slot="title">{{translate('dialog.buttons.delete')}}</template>
              <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </div>

      <!-- add empty invisible cards if chunk is < 3-->
      <div class="card" v-for="index in (itemCountPerRow - chunk.length)" style="visibility: hidden" :key="'empty-' + index"></div>
    </div>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from 'src/panel/helpers/socket';

import { Vue, Component, Watch  } from 'vue-property-decorator';
import { chunk } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faLink, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';
library.add(faLink, faTrash, faCheckSquare, faSquare);

import type { GalleryInterface } from 'src/bot/database/entity/gallery';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
})
export default class galleryRegistryEdit extends Vue {
  chunk = chunk;

  socket = getSocket('/overlays/gallery');
  domWidth = 0;

  state: {
    loading: number;
    uploading: number;
  } = {
    loading: this.$state.progress,
    uploading: this.$state.idle,
  }

  uploadedFiles = 0;
  isUploadingNum = 0;

  items: GalleryInterface[] = [];
  exclude: any[] = [];

  mounted() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, items: GalleryInterface[]) => {
      console.debug('Loaded', items);
      this.items = items
      this.state.loading = this.$state.success;
    })
    setInterval(() => {
      if (this.$refs['window']) {
        this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
      }
    }, 1000)
  }

  get filtered() {
    return this.items.filter(o => {
      const isVideoIncluded = !(this.exclude.includes('video') && o.type.includes('video'))
      const isImageIncluded = !(this.exclude.includes('images') && o.type.includes('image'))
      const isAudioIncluded = !(this.exclude.includes('audio') && o.type.includes('audio'))
      return isVideoIncluded && isImageIncluded && isAudioIncluded
    })
  }

  get itemCountPerRow() {
    if (this.domWidth > 1400) return 6
    if (this.domWidth > 1300) return 5
    if (this.domWidth > 1100) return 4
    else if (this.domWidth > 800) return 3
    else if (this.domWidth > 600) return 2
    else return 4
  }

  @Watch('uploadedFiles')
  _uploadedFiles(val: number) {
    if (this.isUploadingNum === val) {
      this.state.uploading = this.$state.idle;
    }
  }

  toggle(type: GalleryInterface['type']) {
    if (this.exclude.includes(type)) {
      this.exclude = this.exclude.filter(o => o !== type)
    } else this.exclude.push(type)
  }

  remove(id: string) {
    this.socket.emit('generic::deleteById', id, (err: string | null) => {
      if (err) {
        console.error(err);
      } else {
        this.items = this.items.filter(o => o.id != id)
      }
    })
  }

  filesChange(files: HTMLInputElement['files']) {
    if (!files) {
      return;
    }
    this.state.uploading = this.$state.progress;
    this.isUploadingNum = files.length
    this.uploadedFiles = 0

    for (let i = 0, l = files.length; i < l; i++) {
      const reader = new FileReader()
      reader.onload = ((e: any) => {
        this.socket.emit('gallery::upload', [files[i].name, e.target.result], (err: string | null, item: GalleryInterface) => {
          if (err) {
            return console.error(err);
          }
          this.uploadedFiles++
          this.items.push(item)
        })
      })
      reader.readAsDataURL(files[i])
    }
  }
}
</script>
