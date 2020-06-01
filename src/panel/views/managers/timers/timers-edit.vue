<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.timers') }}
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
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/timers/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ item.isEnabled ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" icon="power-off" @click="item.isEnabled = !item.isEnabled">
          {{ translate('dialog.buttons.' + (item.isEnabled? 'enabled' : 'disabled')) }}
        </button-with-icon>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-form v-else>
      <b-form-group
        :label="translate('timers.dialog.name')"
        :description="translate('timers.dialog.placeholders.name')"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model="item.name"
            type="text"
            :placeholder="translate('timers.dialog.placeholders.name')"
            @input="$v.item.$touch()"
            :state="$v.item.name.$invalid && $v.item.name.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.name.$invalid && $v.item.name.$dirty)">{{ translate('timers.errors.timer_name_must_be_compliant') }}</b-form-invalid-feedback>
      </b-form-group>

      <b-row>
        <b-col>
          <b-form-group
            :label="translate('timers.dialog.messages')"
            :description="translate('timers.dialog.placeholders.messages')"
            label-for="messages"
          >
            <b-input-group>
              <b-form-input
                id="messages"
                v-model="item.triggerEveryMessage"
                type="number"
                min="0"
                :placeholder="translate('timers.dialog.placeholders.messages')"
                @input="$v.item.$touch()"
              ></b-form-input>
            </b-input-group>
        </b-form-group>
      </b-col>
      <b-col>
        <b-form-group
          :label="translate('timers.dialog.seconds')"
          :description="translate('timers.dialog.placeholders.seconds')"
          label-for="seconds"
        >
          <b-input-group>
            <b-form-input
              id="seconds"
              v-model="item.triggerEverySecond"
              type="number"
              min="0"
              :placeholder="translate('timers.dialog.placeholders.seconds')"
              @input="$v.item.$touch()"
            ></b-form-input>
            </b-input-group>
          </b-form-group>
        </b-col>
      </b-row>

      <b-form-group>
        <label>{{translate('timers.dialog.responses')}}</label>
        <b-input-group v-for="(response, index) of item.messages" :key="index" class="pb-1">
          <b-input-group-prepend>
            <b-button @click="response.isEnabled = !response.isEnabled" :variant="response.isEnabled ? 'success' : 'danger'">
              {{ response.isEnabled ? translate('enabled') : translate('disabled') }}
            </b-button>
          </b-input-group-prepend>

          <textarea-with-tags
            class="w-50"
            :value.sync="response.response"
            v-bind:filters="['global']"
            v-bind:placeholder="''"
            />

          <b-input-group-append>
            <hold-button @trigger="delResponse(index)" icon="trash" class="btn-danger btn-reverse btn-only-icon"></hold-button>
          </b-input-group-append>
        </b-input-group>
        <button type="button" class="btn btn-success btn-block" @click="addResponse()">{{ translate('systems.timers.add_response') }}</button>
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
import { required } from 'vuelidate/lib/validators';

import { TimerInterface, TimerResponseInterface } from 'src/bot/database/entity/timer';

import { v4 as uuid } from 'uuid';

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])


const mustBeCompliant = (value: string) => value.length === 0 || !!value.match(/^[a-zA-Z0-9_]+$/);

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
    'textarea-with-tags': () => import('../../../components/textareaWithTags.vue'),
  },
  filters: {
    capitalize(value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class timerssEdit extends Vue {
  socket = getSocket('/systems/timers');

  state: {
    loading: number;
    save: number;
    pending: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
  }

  item: TimerInterface = {
    id: uuid(),
    name: '',
    triggerEveryMessage: 0,
    triggerEverySecond: 0,
    isEnabled: true,
    triggeredAtTimestamp: Date.now(),
    triggeredAtMessages: 0,
    messages: [],
  }


  @Validations()
  validations = {
    item: {
      name: { mustBeCompliant, required },
    }
  }

  @Watch('item', { deep: true })
  pending() {
    if (this.state.loading === this.$state.success) {
      this.state.pending = true;
    }
  }

  addResponse() {
    const response: TimerResponseInterface = {
      id: uuid(),
      timestamp: Date.now(),
      isEnabled: true,
      response: '',
    };
    this.item.messages.push(response);
  }

  delResponse(index: number) {
    this.item.messages.splice(index, 1);
  }

  async mounted() {
    if (this.$route.params.id) {
      await new Promise((resolve, reject) => {
        this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, data: Required<TimerInterface>) => {
        if (err) {
          reject(err)
        }
        this.item = data;
        resolve()
        })
      })
    }

    this.$nextTick(() => {
      this.state.loading = this.$state.success;
    })
  }

  del() {
    this.socket.emit('generic::deleteById', this.$route.params.id, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
      this.$router.push({ name: 'TimersManagerList' })
    })
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

      this.socket.emit('timers::save', this.item, (err: string | null, data: Required<TimerInterface>) => {
        if (err) {
          this.state.save = this.$state.fail;
          return console.error(err);
        }

        this.state.save = this.$state.success;
        this.item = data;
        this.$nextTick(() => {
          this.state.pending = false;
          this.$router.push({ name: 'TimersManagerEdit', params: { id: String(this.item.id) } })
        })
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