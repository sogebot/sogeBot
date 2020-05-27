<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.carouseloverlay') }}
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
              accept="image/*"/>
        </form>
      </template>
    </panel>

    <b-table v-if="items.length > 0" striped small hover :items="items" :fields="fields" @row-clicked="linkTo($event)" sort-by="order">
      <template v-slot:cell(thumbnail)="data">
        <img class="float-left pr-3" v-bind:src="'data:' + data.item.type + ';base64,' + data.item.base64">
      </template>

      <template v-slot:cell(info)="data">
        <template v-for="key of Object.keys(data.item)">
          <b-row v-if="!['_id', 'id', 'order', 'base64', 'type'].includes(key)" :key="key">
            <dt class="col-6">{{translate('page.settings.overlays.carousel.titles.' + key)}}</dt>
            <dd class="col-6">{{data.item[key]}}</dd>
          </b-row>
        </template>
      </template>

      <template v-slot:cell(buttons)="data">
        <div class="float-right" style="width: max-content !important;">
          <button-with-icon v-if="data.item.order != 0" class="btn-only-icon btn-secondary btn-reverse" icon="long-arrow-alt-up" @click="moveUp(data.item.order)"/>
          <button-with-icon v-if="data.item.order < (items.length - 1)" class="btn-only-icon btn-secondary btn-reverse" icon="long-arrow-alt-down" @click="moveDown(data.item.order)"/>
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/registry/carousel/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="remove(data.item)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
    <loading v-if="state.loading !== $state.success"/>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faCircleNotch, faUpload, faLongArrowAltUp, faLongArrowAltDown } from '@fortawesome/free-solid-svg-icons';
library.add(faCircleNotch, faUpload, faLongArrowAltUp, faLongArrowAltDown);

import { getSocket } from 'src/panel/helpers/socket';
import { CarouselInterface } from 'src/bot/database/entity/carousel';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
  },
})
export default class carouselOverlayList extends Vue {
  socket = getSocket('/overlays/carousel');

  fields = [
    { key: 'thumbnail', label: '', tdClass: 'fitThumbnail' },
    { key: 'info', label: '' },
    { key: 'buttons', label: '' },
  ];

  items: CarouselInterface[] = []

  state: {
    loading: number;
    uploading: number;
  } = {
    loading: this.$state.progress,
    uploading: this.$state.idle,
  }
  uploadedFiles: number = 0;
  isUploadingNum: number = 0;

  created() {
    this.refresh();
  }

  refresh() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, items: CarouselInterface[]) => {
      if (err) {
        return console.error(err);
      }
      this.items = items;
      this.state.loading = this.$state.success;
    })
  }

  @Watch('uploadedFiles')
  _uploadedFiles(val: number) {
    if (this.isUploadingNum === val) {
      this.state.uploading = this.$state.idle;
    }
  }

  moveUp(order: number) {
  this.items.filter((o) => o.order === order - 1 || o.order === order).map(o => {
      if (o.order === order - 1) {
        o.order++
      } else {
        o.order--
      }
      return o
    })
    this.socket.emit('carousel::save', this.items, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
    });
  }

  moveDown(order: number) {
  this.items.filter((o) => o.order === order + 1 || o.order === order).map(o => {
      if (o.order === order + 1) {
        o.order--
      } else {
        o.order++
      }
      return o
    })
    this.socket.emit('carousel::save', this.items, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
    });
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
      reader.onload = ((e: any )=> {
        this.socket.emit('carousel::insert', e.target.result, (err: string | null, image: CarouselInterface) => {
          if (err) {
            return console.error(err);
          }
          this.uploadedFiles++
          this.items.push(image)
        })
      })
      reader.readAsDataURL(files[i])
    }
  }

  linkTo(item: Required<CarouselInterface>) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'carouselRegistryEdit', params: { id: item.id } });
  }

  remove(item: CarouselInterface) {
    this.socket.emit('generic::deleteById', item.id, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
      this.refresh();
    });
  }
}
</script>

<style>
.fitThumbnail {
  width: 200px;
}
.fitThumbnail img {
  width: inherit;
}
</style>