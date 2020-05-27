<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.cooldown') }}
          <template v-if="$route.params.id">
            <small><fa icon="angle-right"/></small>
            {{item.name}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-shrink btn-reverse" icon="caret-left" href="#/manage/cooldowns/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-shrink btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ item.isEnabled ? 'btn-success' : 'btn-danger' ]" class="btn-shrink btn-reverse" icon="power-off" @click="item.isEnabled = !item.isEnabled">
          {{ translate('dialog.buttons.' + (item.isEnabled? 'enabled' : 'disabled')) }}
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
        :label="'!' + translate('command') + ' ' + translate('or') + ' ' + translate('keyword')"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model="item.name"
            type="text"
            :placeholder="translate('systems.cooldown.key.placeholder')"
            @input="$v.item.name.$touch()"
            :state="$v.item.name.$invalid && $v.item.name.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.name.$invalid && $v.item.name.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>
      <b-form-group
        :label="translate('cooldown') + ' (' + this.translate('in-seconds') + ')'"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model.number="seconds"
            type="text"
            @input="$v.item.miliseconds.$touch()"
            :state="$v.item.miliseconds.$invalid && $v.item.miliseconds.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.miliseconds.$invalid && $v.item.miliseconds.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 10) }}</b-form-invalid-feedback>
      </b-form-group>

      <b-form-group
        :label="translate('commons.additional-settings')"
      >
        <button-with-icon :class="[ item.isErrorMsgQuiet ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.isErrorMsgQuiet ? 'volume-off' : 'volume-up'" @click="item.isErrorMsgQuiet = !item.isErrorMsgQuiet">
          {{ translate(item.isErrorMsgQuiet? 'quiet' : 'noisy') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.isOwnerAffected ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.isOwnerAffected ? 'check' : 'times'" @click="item.isOwnerAffected = !item.isOwnerAffected">
          {{ translate('core.permissions.casters') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.isModeratorAffected ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.isModeratorAffected ? 'check' : 'times'" @click="item.isModeratorAffected = !item.isModeratorAffected">
          {{ translate('core.permissions.moderators') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.isSubscriberAffected ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.isSubscriberAffected ? 'check' : 'times'" @click="item.isSubscriberAffected = !item.isSubscriberAffected">
          {{ translate('core.permissions.subscribers') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.isFollowerAffected ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.isFollowerAffected ? 'check' : 'times'" @click="item.isFollowerAffected = !item.isFollowerAffected">
          {{ translate('core.permissions.followers') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.type === 'global' ? 'btn-primary' : 'btn-secondary' ]" class="btn-reverse" :icon="item.isFollowerAffected ? 'check' : 'times'" @click="item.type = item.type === 'global' ? 'user' : 'global'">
          {{ translate(item.type) | capitalize }}
        </button-with-icon>
      </b-form-group>
    </b-form>
  </b-container>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { Validations } from 'vuelidate-property-decorators';
import { required, minValue } from 'vuelidate/lib/validators'

import { v4 as uuid } from 'uuid';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheck, faTimes, faVolumeUp, faVolumeOff } from '@fortawesome/free-solid-svg-icons';
import { CooldownInterface } from 'src/bot/database/entity/cooldown';
library.add(faVolumeUp, faVolumeOff, faCheck, faTimes);

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize(value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class cooldownEdit extends Vue {
  socket = getSocket('/systems/cooldown');

  state: {
    loading: number;
    save: number;
    pending: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
  }

  item: CooldownInterface = {
    id: uuid(),
    name: '',
    miliseconds: 600000,
    type: 'global',
    timestamp: 0,
    isErrorMsgQuiet: false,
    isEnabled: true,
    isOwnerAffected: true,
    isModeratorAffected: true,
    isSubscriberAffected: true,
    isFollowerAffected: true,
    viewers: [],
  }

  get seconds() {
    return this.item.miliseconds / 1000;
  }

  set seconds(value: number) {
    this.item.miliseconds = value * 1000;
  }


  @Validations()
  validations = {
    item: {
      name: {required},
      miliseconds: { required, minValue: minValue(10000) }
    }
  }

  @Watch('item', { deep: true })
  pending() {
    if (this.state.loading === this.$state.success) {
      this.state.pending = true;
    }
  }

  async mounted() {
    if (this.$route.params.id) {
      await new Promise((resolve, reject) => {
        this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, data: CooldownInterface) => {
          if (err) {
            this.$router.push({ name: 'cooldownsManagerList' });
            reject(err)
          }
          console.debug('Loaded', data);
          this.item = data
          resolve();
        })
      })
    }

    this.$nextTick(() => {
      this.state.loading = this.$state.success;
    })
  }

  del() {
    this.socket.emit('generic::deleteById', this.$route.params.id, () => {
      this.$router.push({ name: 'cooldownsManagerList' })
    })
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

      this.socket.emit('cooldown::save', this.item, (err: string | null, data: CooldownInterface) => {
        if (err) {
          this.state.save = this.$state.fail;
          return console.error(err);
        }

        this.state.save = this.$state.success;
        this.state.pending = false;
        this.$router.push({ name: 'cooldownsManagerEdit', params: { id: String(data.id) } })
        setTimeout(() => {
          this.state.save = this.$state.idle;
        }, 1000)
      });
    }
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