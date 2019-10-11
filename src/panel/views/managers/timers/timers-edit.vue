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
            {{item.timer.name}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/timers/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button :if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ item.timer.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" icon="power-off" @click="item.timer.enabled = !item.timer.enabled">
          {{ translate('dialog.buttons.' + (item.timer.enabled? 'enabled' : 'disabled')) }}
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
            v-model="item.timer.name"
            type="text"
            :placeholder="translate('timers.dialog.placeholders.name')"
            @input="$v.item.timer.$touch()"
            :state="$v.item.timer.name.$invalid && $v.item.timer.name.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.timer.name.$invalid && $v.item.timer.name.$dirty)">{{ translate('timers.errors.timer_name_must_be_compliant') }}</b-form-invalid-feedback>
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
                v-model="item.timer.messages"
                type="number"
                min="0"
                :placeholder="translate('timers.dialog.placeholders.messages')"
                @input="$v.item.timer.$touch()"
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
              v-model="item.timer.seconds"
              type="number"
              min="0"
              :placeholder="translate('timers.dialog.placeholders.seconds')"
              @input="$v.item.timer.$touch()"
            ></b-form-input>
            </b-input-group>
          </b-form-group>
        </b-col>
      </b-row>

      <b-form-group>
        <label>{{translate('timers.dialog.responses')}}</label>
        <b-input-group v-for="(response, index) of item.responses" :key="index" class="pb-1">
          <b-input-group-prepend>
            <b-button @click="response.enabled = !response.enabled" :variant="response.enabled ? 'success' : 'danger'">
              {{ response.enabled ? translate('enabled') : translate('disabled') }}
            </b-button>
          </b-input-group-prepend>

          <textarea-with-tags
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

import { Validations } from 'vuelidate-property-decorators';

import uuid from 'uuid/v4';

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])


const mustBeCompliant = (value) => value.length === 0 || !!value.match(/^[a-zA-Z0-9_]+$/);

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
    'textarea-with-tags': () => import('../../../components/textareaWithTags.vue'),
  },
  filters: {
    capitalize(value) {
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

  item: {
    timer: Types.Timers.Timer;
    responses: Types.Timers.Response[];
  } = {
    timer: {
      id: uuid(),
      name: '',
      messages: 0,
      seconds: 0,
      enabled: true,
      trigger: {
        messages: 0,
        timestamp: Date.now(),
      }
    },
    responses: [],
  }


  @Validations()
  validations = {
    item: {
      timer: {
        name: { mustBeCompliant },
      }
    }
  }

  @Watch('item', { deep: true })
  pending() {
    if (this.state.loading === this.$state.success) {
      this.state.pending = true;
    }
  }

  addResponse() {
    this.item.responses.push({
      timerId: this.item.timer.id,
      timestamp: Date.now(),
      enabled: true,
      response: '',
    })
  }

  delResponse(index) {
    this.item.responses.splice(index, 1);
  }

  async mounted() {
    if (this.$route.params.id) {
      await new Promise((resolve, reject) => {
        this.socket.emit('findOne.timer', { id: this.$route.params.id }, (err, data) => {
        if (err) {
          reject(err)
        }
        console.log({data})
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
    this.socket.emit('delete.timer', this.$route.params.id, (err, deleted) => {
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

      this.socket.emit('update.timer', this.item, (err, data) => {
        if (err) {
          this.state.save = this.$state.fail;
          return console.error(err);
        }

        this.state.save = this.$state.success;
        this.item = data;
        this.$nextTick(() => {
          this.state.pending = false;
          this.$router.push({ name: 'TimersManagerEdit', params: { id: String(this.item.timer.id) } })
        })
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