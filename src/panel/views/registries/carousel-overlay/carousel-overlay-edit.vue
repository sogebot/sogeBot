<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.carouseloverlay') }}
          <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-shrink btn-reverse" icon="caret-left" href="#/registry/carousel/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button @trigger="del()" icon="trash" class="btn-shrink btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon class="btn-shrink btn-reverse"
                          :class="[ item.showOnlyOncePerStream ? 'btn-success' : 'btn-danger' ]"
                          :icon="item.showOnlyOncePerStream ? 'check' : 'times'"
                          @click="item.showOnlyOncePerStream = !item.showOnlyOncePerStream">
          {{translate('page.settings.overlays.carousel.titles.showOnlyOncePerStream')}}
        </button-with-icon>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" class="btn-shrink" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <b-form v-else>
      <b-form-group
        :label="translate('page.settings.overlays.carousel.titles.waitBefore')"
        label-for="waitBefore"
      >
        <b-input-group>
          <b-form-input
            id="waitBefore"
            v-model.number="item.waitBefore"
            type="number"
            min="0"
            @input="$v.item.$touch()"
            :state="$v.item.waitBefore.$invalid && $v.item.waitBefore.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.waitBefore.$invalid && $v.item.waitBefore.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 0) }}</b-form-invalid-feedback>
      </b-form-group>
      <b-form-group
        :label="translate('page.settings.overlays.carousel.titles.waitAfter')"
        label-for="waitAfter"
      >
        <b-input-group>
          <b-form-input
            id="waitAfter"
            v-model.number="item.waitAfter"
            type="number"
            min="0"
            @input="$v.item.$touch()"
            :state="$v.item.waitAfter.$invalid && $v.item.waitAfter.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.waitAfter.$invalid && $v.item.waitAfter.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 0) }}</b-form-invalid-feedback>
      </b-form-group>

      <b-row>
        <b-col>
          <b-form-group
            :label="translate('page.settings.overlays.carousel.titles.animationIn')"
            label-for="animationIn"
          >
            <b-form-select v-model="item.animationIn" :options="animationInOptions" plain></b-form-select>
          </b-form-group>
        </b-col>
        <b-col>
          <b-form-group
            :label="translate('page.settings.overlays.carousel.titles.animationInDuration')"
            label-for="animationInDuration"
          >
            <b-input-group>
              <b-form-input
                id="animationInDuration"
                v-model.number="item.animationInDuration"
                type="number"
                min="100"
                @input="$v.item.$touch()"
                :state="$v.item.animationInDuration.$invalid && $v.item.animationInDuration.$dirty ? false : null"
              ></b-form-input>
            </b-input-group>
            <b-form-invalid-feedback :state="!($v.item.animationInDuration.$invalid && $v.item.animationInDuration.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 100) }}</b-form-invalid-feedback>
          </b-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col>
          <b-form-group
            :label="translate('page.settings.overlays.carousel.titles.animationOut')"
            label-for="animationOut"
          >
            <b-form-select v-model="item.animationOut" :options="animationOutOptions" plain></b-form-select>
          </b-form-group>
        </b-col>
        <b-col>
          <b-form-group
            :label="translate('page.settings.overlays.carousel.titles.animationOutDuration')"
            label-for="animationOutDuration"
          >
            <b-input-group>
              <b-form-input
                id="animationOutDuration"
                v-model.number="item.animationOutDuration"
                type="number"
                min="100"
                @input="$v.item.$touch()"
                :state="$v.item.animationOutDuration.$invalid && $v.item.animationOutDuration.$dirty ? false : null"
              ></b-form-input>
            </b-input-group>
            <b-form-invalid-feedback :state="!($v.item.animationOutDuration.$invalid && $v.item.animationOutDuration.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 100) }}</b-form-invalid-feedback>
          </b-form-group>
        </b-col>
      </b-row>

      <b-img thumbnail fluid :src="'data:' + item.type + ';base64,' + item.base64"></b-img>
    </b-form>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { CarouselInterface } from 'src/bot/database/entity/carousel';

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { Validations } from 'vuelidate-property-decorators';
import { required, minValue } from 'vuelidate/lib/validators'

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  }
})
export default class carouselOverlayEdit extends Vue {
  socket = getSocket('/overlays/carousel');

  item: CarouselInterface = {
    id: '',
    type: '',
    base64: '',
    waitBefore: 0,
    waitAfter: 0,
    duration: 0,
    animationInDuration: 0,
    animationIn: 'fadeIn',
    animationOutDuration: 0,
    animationOut: 'fadeIn',
    order: 0,
    showOnlyOncePerStream: false,
  }

  animationInOptions = [
    { value: 'fadeIn', text: 'fadeIn' },
    { value: 'blurIn', text: 'blurIn' },
    { value: 'slideUp', text: 'slideUp' },
    { value: 'slideDown', text: 'slideDown' },
    { value: 'slideLeft', text: 'slideLeft' },
    { value: 'slideRight', text: 'slideRight' },
  ]

  animationOutOptions = [
    { value: 'fadeOut', text: 'fadeOut' },
    { value: 'blurOut', text: 'blurOut' },
    { value: 'slideUp', text: 'slideUp' },
    { value: 'slideDown', text: 'slideDown' },
    { value: 'slideLeft', text: 'slideLeft' },
    { value: 'slideRight', text: 'slideRight' },
  ]

  state: {
    loading: number;
    save: number;
    pending: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
  }

  @Validations()
  validations = {
    item: {
      waitBefore: {required, minValue: minValue(0)},
      waitAfter: {required, minValue: minValue(0)},
      animationInDuration: {required, minValue: minValue(100)},
      animationOutDuration: {required, minValue: minValue(100)},
    }
  }

  @Watch('item', { deep: true })
  pending() {
    if (this.state.loading === this.$state.success) {
      this.state.pending = true;
    }
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

      this.socket.emit('carousel::save', this.item, (err: string | null, data: CarouselInterface) => {
        if (err) {
          return console.error(err);
        }
        this.state.save = this.$state.success;
        this.state.pending = false;
        this.$router.push({ name: 'carouselRegistryEdit', params: { id: String(data.id) } })
        setTimeout(() => {
          this.state.save = this.$state.idle;
        }, 1000)
      });
    }
  }

  del() {
    this.socket.emit('generic::deleteById', this.item.id, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
      this.$router.push({ name: 'carouselRegistryList' })
    })
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, item: CarouselInterface) => {
      if (err) {
        return console.error(err);
      }
      this.item = item;
      this.$nextTick(() => {
        this.state.loading = this.$state.success;
      })
    })
  }

  beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
    if (this.state.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }

  beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
    if (this.state.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }
}

</script>