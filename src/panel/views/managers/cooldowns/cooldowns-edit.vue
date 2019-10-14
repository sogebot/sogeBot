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
            {{item.key}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-shrink btn-reverse" icon="caret-left" href="#/manage/cooldowns/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button :if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-shrink btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-shrink btn-reverse" icon="power-off" @click="item.enabled = !item.enabled">
          {{ translate('dialog.buttons.' + (item.enabled? 'enabled' : 'disabled')) }}
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
            v-model="item.key"
            type="text"
            :placeholder="translate('systems.cooldown.key.placeholder')"
            @input="$v.item.key.$touch()"
            :state="$v.item.key.$invalid && $v.item.key.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.key.$invalid && $v.item.key.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
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
        <button-with-icon :class="[ item.quiet ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.quiet ? 'volume-off' : 'volume-up'" @click="item.quiet = !item.quiet">
          {{ translate(item.quiet? 'quiet' : 'noisy') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.owner ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.owner ? 'check' : 'times'" @click="item.owner = !item.owner">
          {{ translate('core.permissions.casters') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.moderator ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.moderator ? 'check' : 'times'" @click="item.moderator = !item.moderator">
          {{ translate('core.permissions.moderators') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.subscriber ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.subscriber ? 'check' : 'times'" @click="item.subscriber = !item.subscriber">
          {{ translate('core.permissions.subscribers') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.follower ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.follower ? 'check' : 'times'" @click="item.follower = !item.follower">
          {{ translate('core.permissions.followers') | capitalize }}
        </button-with-icon>
        <button-with-icon :class="[ item.type === 'global' ? 'btn-primary' : 'btn-secondary' ]" class="btn-reverse" :icon="item.follower ? 'check' : 'times'" @click="item.type = item.type === 'global' ? 'user' : 'global'">
          {{ translate(item.type) | capitalize }}
        </button-with-icon>
      </b-form-group>
    </b-form>
  </b-container>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import { Validations } from 'vuelidate-property-decorators';
import { required, minValue } from 'vuelidate/lib/validators'

import uuid from 'uuid/v4';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheck, faTimes, faVolumeUp, faVolumeOff } from '@fortawesome/free-solid-svg-icons';
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
    capitalize(value) {
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

  item: Types.Cooldown.Item = {
    id: uuid(),
    key: '',
    miliseconds: 600000,
    type: 'global',
    timestamp: 0,
    quiet: false,
    enabled: true,
    owner: true,
    moderator: true,
    subscriber: true,
    follower: true,
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
      key: {required},
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
        this.socket.emit('findOne', { where: { id: this.$route.params.id } }, (err, data: Types.Cooldown.Item) => {
          if (err) {
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
    this.socket.emit('delete', { where: { id: this.$route.params.id }}, (err, deleted) => {
      if (err) {
        return console.error(err);
      }
      this.$router.push({ name: 'cooldownManagerList' })
    })
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

      this.socket.emit('update', { key: 'id', items: [this.item] }, (err, data) => {
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

  beforeRouteUpdate(to, from, next) {
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

  beforeRouteLeave(to, from, next) {
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