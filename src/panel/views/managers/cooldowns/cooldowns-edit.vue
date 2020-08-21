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
      <name :value.sync="item.value" :forType="item.for" @touch="$v.item.name.$touch()" :state="$v.item.name.$invalid && $v.item.name.$dirty"/>

      <b-row>
        <b-col>
          <b-form-group :label="translate('systems.cooldown.type')">
            <b-btn :variant="item.type === 'global' ? 'secondary' : 'outline-secondary'" @click="item.type = 'global'"><strong>global</strong> <small class="text-muted">users will share cooldown</small></b-btn>
            <b-btn :variant="item.type === 'user' ? 'secondary' : 'outline-secondary'"  @click="item.type = 'user'"><strong>user</strong> <small class="text-muted">users will have own cooldown</small></b-btn>
          </b-form-group>

          <b-form-group :label="translate('systems.cooldown.pool')">
            <b-btn :variant="item.pool === 'per-item' ? 'secondary' : 'outline-secondary'" @click="item.pool = 'per-item'"><strong>per item</strong> <small class="text-muted">each command, keyword will have own cooldown</small></b-btn>
            <b-btn :variant="item.pool === 'shared' ? 'secondary' : 'outline-secondary'"  @click="item.pool = 'shared'"><strong>shared</strong> <small class="text-muted">each command, keyword will have shared cooldown</small></b-btn>
          </b-form-group>

          <b-form-group :label="translate('systems.cooldown.announce')">
            <b-btn :variant="item.isErrorMsgQuiet ? 'secondary' : 'outline-secondary'" @click="item.isErrorMsgQuiet = true"><strong>quiet</strong> <small class="text-muted">cooldown won't send message into chat</small></b-btn>
            <b-btn :variant="!item.isErrorMsgQuiet ? 'secondary' : 'outline-secondary'"  @click="item.isErrorMsgQuiet = false"><strong>noisy</strong> <small class="text-muted">cooldown and time until cooldown expires will be announced in chat</small></b-btn>
          </b-form-group>

          <b-form-group :label="translate('systems.cooldown.wipeType')">
            <b-btn :variant="item.wipeType === 'full' ? 'secondary' : 'outline-secondary'" @click="item.wipeType = 'full'"><strong>full</strong> <small class="text-muted">cooldown will reset {{seconds}} seconds after <strong>first</strong> command/keyword usage</small></b-btn>
            <b-btn :variant="item.wipeType === 'full-last' ? 'secondary' : 'outline-secondary'" @click="item.wipeType = 'full-last'"><strong>full (last)</strong> <small class="text-muted">cooldown will reset  {{seconds}} seconds after <strong>last</strong> command/keyword usage</small></b-btn>
            <b-btn :variant="item.wipeType === 'gradual' ? 'secondary' : 'outline-secondary'"  @click="item.wipeType = 'gradual'"><strong>gradual</strong> <small class="text-muted">cooldown will gradually reset to usage limit</small></b-btn>
          </b-form-group>
        </b-col>
        <b-col>
          <global-permission-to-apply/>
        </b-col>
        <b-col>
          <b-form-group
            :label="translate('cooldown') + ' (' + this.translate('in-seconds') + ')'"
            label-for="seconds"
          >
            <b-input-group>
              <b-form-input
                id="seconds"
                v-model.number="seconds"
                type="number"
                @input="$v.item.miliseconds.$touch()"
                :state="$v.item.miliseconds.$invalid && $v.item.miliseconds.$dirty ? false : null"
              ></b-form-input>
            </b-input-group>
            <b-form-invalid-feedback :state="!($v.item.miliseconds.$invalid && $v.item.miliseconds.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 10) }}</b-form-invalid-feedback>
          </b-form-group>
          <b-form-group
            :label="translate('usageLimit')"
            label-for="usageLimit"
          >
            <b-input-group>
              <b-form-input
                id="usageLimit"
                v-model.number="item.usageLimit"
                type="number"
                @input="$v.item.usageLimit.$touch()"
                :state="$v.item.usageLimit.$invalid && $v.item.usageLimit.$dirty ? false : null"
              ></b-form-input>
            </b-input-group>
            <b-form-invalid-feedback :state="!($v.item.usageLimit.$invalid && $v.item.usageLimit.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 1) }}</b-form-invalid-feedback>
          </b-form-group>
        </b-col>
      </b-row>
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
    'name': () => import('./components/name.vue'),
    'global-permission-to-apply': () => import('./components/global-permission-to-apply.vue'),
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
    value: [],
    miliseconds: 600000,
    type: 'global',
    pool: 'per-item',
    wipeType: 'full',
    usageLimit: 1,
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
      miliseconds: { required, minValue: minValue(10000) },
      usageLimit: { required, minValue: minValue(1) }
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