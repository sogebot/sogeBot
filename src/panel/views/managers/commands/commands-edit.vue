<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.customcommands') }}
          <template v-if="state.loadedCmd === $state.success && state.loadedPerm === $state.success && $route.params.id">
            <small><fa icon="angle-right"/></small>
            !{{item.command}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/commands/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id && state.loadedCmd === $state.success && state.loadedPerm === $state.success" icon="trash" class="btn-danger" @trigger="remove()">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </template>
      <template v-slot:right v-if="state.loadedCmd === $state.success && state.loadedPerm === $state.success">
        <b-alert show variant="info" v-if="pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$error"/>
      </template>
    </panel>

    <loading v-if="state.loadedCmd !== $state.success || state.loadedPerm !== $state.success" />
    <b-form v-else>
      <b-form-group
        :label="translate('systems.customcommands.command.name')"
        label-for="name"
      >
        <b-input-group prepend="!">
          <b-form-input
            id="name"
            v-model="item.command"
            type="text"
            :placeholder="translate('systems.customcommands.command.placeholder')"
            @input="$v.item.command.$touch()"
            :state="$v.item.command.$invalid && $v.item.command.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.command.$invalid && $v.item.command.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>

      <b-form-group>
        <label>{{ translate('systems.customcommands.response.name') }}</label>
        <div style="display: flex; flex: 1 1 auto" :key="i" :class="[i !== 0 ? 'pt-2' : '']" v-for="(response, i) of orderBy(item.responses, 'order', 'asc')">
          <textarea-with-tags
            :value.sync="response.response"
            v-bind:placeholder="translate('systems.customcommands.response.placeholder')"
            v-bind:filters="['global', 'sender', 'param', '!param', 'touser']"
            v-on:update="response.response = $event"></textarea-with-tags>
          <textarea-with-tags
            :value.sync="response.filter"
            v-bind:placeholder="translate('systems.customcommands.filter.placeholder')"
            v-on:update="response.filter = $event"
            v-bind:filters="['sender', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'rank', 'game', 'title', 'views', 'followers', 'hosts', 'subscribers']"></textarea-with-tags>
          <div class="h-auto w-auto" style="flex-shrink: 0;">
            <button data-toggle="dropdown" class="btn btn-outline-dark border-0 h-100 w-100" style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">
              <fa icon="key" class="mr-1" aria-hidden="true"></fa>
              <span v-if="getPermissionName(response.permission)">{{ getPermissionName(response.permission) }}</span>
              <span v-else class="text-danger"><fa icon="exclamation-triangle"/> Permission not found</span>
            </button>
            <div class="dropdown-menu" aria-labelledby="permissionsMenuButton">
              <a class="dropdown-item"
                  style="cursor: pointer"
                  v-for="p of permissions"
                  :key="p.id"
                  @click="response.permission = p.id; pending = true;">{{ getPermissionName(p.id) | capitalize }}</a>
            </div>
          </div>
          <div class="h-auto w-auto" style="flex-shrink: 0;">
            <button data-toggle="dropdown" class="btn btn-outline-dark border-0 h-100 w-100" style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">
              <fa class="mr-1" :icon="[response.stopIfExecuted ? 'stop' : 'play']" aria-hidden="true"></fa>
              {{ translate(response.stopIfExecuted ? 'commons.stop-if-executed' : 'commons.continue-if-executed') | capitalize }}</button>
            <div class="dropdown-menu">
              <a class="dropdown-item" style="cursor: pointer" v-on:click="response.stopIfExecuted = true; pending = true">{{ translate('commons.stop-if-executed') | capitalize }}</a>
              <a class="dropdown-item" style="cursor: pointer" v-on:click="response.stopIfExecuted = false; pending = true">{{ translate('commons.continue-if-executed') | capitalize }}</a>
            </div>
          </div>

          <div class="h-auto w-auto" style="flex-shrink: 0;">
            <button v-if="item.responses.length > 1" data-toggle="dropdown" class="btn btn-block btn-outline-dark border-0 h-100 w-100">
              <fa icon="ellipsis-v"></fa>
            </button>
            <div class="dropdown-menu p-0">
              <button v-if="i !== 0" class="dropdown-item p-2 pl-4 pr-4" style="cursor: pointer" type="button" @click="moveUpResponse(response.order)">
                <fa icon="sort-up" fixed-width></fa> {{ translate('commons.moveUp') | capitalize }}</button>
              <button v-if="i !== item.responses.length - 1" class="dropdown-item p-2 pl-4 pr-4" style="cursor: pointer" type="button" @click="moveDownResponse(response.order)">
                <fa icon="sort-down" fixed-width></fa> {{ translate('commons.moveDown') | capitalize }}</button>
              <button class="dropdown-item p-2 pl-4 pr-4 text-danger" style="cursor: pointer" type="button" @click="deleteResponse(response.order)">
                <fa icon="trash-alt" fixed-width></fa> {{ translate('delete') }}</button>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-block mt-2" type="button" @click="item.responses.push({ filter: '', order: item.responses.length, response: '', permission: orderBy(permissions, 'order', 'asc').pop().id })">{{ translate('systems.customcommands.addResponse') }}</button>
      </b-form-group>

      <b-form-group>
        <b-row>
          <b-col>
            <label>{{ translate('count') }}</label>
            <input type="number" class="form-control" v-model="item.count" readonly="true">
            <button type="button" class="btn btn-block btn-danger" @click="resetCount">{{ translate('commons.reset') | capitalize }}</button>
          </b-col>
          <b-col>
            <label>{{ translate('visible') }}</label>
            <button type="button" class="btn btn-block" v-on:click="item.visible = !item.visible" v-bind:class="[ item.visible ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">{{ (item.visible ? translate('visible') : translate('hidden')) | capitalize }}</button>
          </b-col>
          <b-col>
            <label>{{ translate('status') }}</label>
            <button type="button" class="btn btn-block" v-on:click="item.enabled = !item.enabled" v-bind:class="[ item.enabled ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">{{ (item.enabled ? translate('enabled') : translate('disabled')) | capitalize }}</button>
          </b-col>
        </b-row>
      </b-form-group>
    </b-form>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { orderBy } from  'lodash-es'

import { Validations } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators';

import uuid from 'uuid/v4';


import { getSocket } from '../../../helpers/socket';

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
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
export default class CommandsEdit extends Vue {
  orderBy = orderBy;


  item: Types.CustomCommands.Command & { responses: Types.CustomCommands.Response[] } = {
    id: uuid(),
    command: '',
    enabled: true,
    visible: true,
    responses: [],
    count: 0,
  }
  permissions: any[] = [];

  psocket = getSocket('/core/permissions');
  socket = getSocket('/systems/customcommands');

  state: { loadedPerm: number; loadedCmd: number; save: number } = {
    loadedPerm: this.$state.progress,
    loadedCmd: this.$state.progress,
    save: this.$state.idle
  };
  pending: boolean = false;

  supportedEvents: string[] = ['follows', 'cheers', 'subs', 'resubs', 'subgifts',  'tips', 'hosts', 'raids']
  selectedTabIndex: number = 0;

  @Validations()
  validations = {
    item: {
      command: {required},
    }
  }

  beforeRouteUpdate(to, from, next) {
    if (this.pending) {
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
    if (this.pending) {
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

  @Watch('item', { deep: true })
  setPendingState() {
    if (this.state.loadedCmd === this.$state.success && this.state.loadedPerm === this.$state.success) {
      this.pending = true;
    }
  }

  created() {
    this.psocket.emit('find', {}, (err, data) => {
      if (err) return console.error(err)
      this.permissions = orderBy(data, 'order', 'asc')
      this.state.loadedPerm = this.$state.success;
    });

    if (this.$route.params.id) {
      this.socket.emit('findOne.command', { where: { id: this.$route.params.id } }, (err, data: Types.CustomCommands.Command & { responses: Types.CustomCommands.Response[] }) => {
        data.command = data.command.replace('!', '');
        console.debug('Loaded', {data})
        // add empty filter if undefined
        for (let i = 0, length = data.responses.length; i < length; i++) {
          if (!data.responses[i].filter) data.responses[i].filter = ''
        }
        this.item = data
        this.$nextTick(() => { this.pending = false })
        this.state.loadedCmd = this.$state.success;
      })
    } else {
      this.state.loadedCmd = this.$state.success;
    }
  }

  getPermissionName(id) {
    if (!id) return 'Disabled'
    const permission = this.permissions.find((o) => {
      return o.id === id
    })
    if (typeof permission !== 'undefined') {
      if (permission.name.trim() === '') {
        return permission.id
      } else {
        return permission.name
      }
    } else {
      return null
    }
  }

  moveUpResponse(order) {
    this.item.responses.filter((o) => o.order === order - 1 || o.order === order).map(o => {
      if (o.order === order - 1) o.order++
      else o.order--
      return o
    })
  }

  moveDownResponse(order) {
    this.item.responses.filter((o) => o.order === order + 1 || o.order === order).map(o => {
      if (o.order === order + 1) o.order--
      else o.order++
      return o
    })
  }

  deleteResponse(order) {
    let i = 0
    this.item.responses = this.item.responses.filter(o => o.order !== order)
    orderBy(this.item.responses, 'order', 'asc').map((o) => {
      o.order = i++
      return o
    })
  }

  resetCount() {
    this.item.count = 0
    this.pending = true
  }

  async remove() {
    await Promise.all([
      await new Promise(resolve => {
        this.socket.emit('delete', { where: { id: this.$route.params.id } }, () => {
          resolve();
        })
      }),
      await new Promise(resolve => {
        this.socket.emit('delete', { collection: 'responses', where: { cid: this.$route.params.id } }, () => {
          resolve();
        })
      }),
    ])
    this.$router.push({ name: 'CommandsManagerList' });
  }

  async save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;
      await Promise.all([
        new Promise(resolve => {
          const command: Types.CustomCommands.Command = (({responses, ...keys}) => ({...keys}))(this.item);
          command.command = '!' + command.command;
          console.debug('Saving command', command);
          this.socket.emit('update', { key: 'id', items: [command] }, (err, data) => {
            if (err) {
              this.state.save = this.$state.fail;
              return console.error(err);
            }
            resolve()
          });
        }),
        new Promise(resolve => {
          const responses: Types.CustomCommands.Response[] = this.item.responses.map(o => { return { cid: this.item.id, ...o} });
          console.debug('Saving responses', responses);
          if (responses.length > 0) {
            this.socket.emit('set', { collection: 'responses', where: { cid: this.item.id }, items: responses }, (err) => {
              if (err) {
                this.state.save = this.$state.fail;
                return console.error(err);
              }
              resolve()
            });
          } else {
            resolve()
          }
        })
      ])

      this.state.save = this.$state.success;
      this.pending = false;
      this.$router.push({ name: 'CommandsManagerEdit', params: { id: this.item.id } }).catch(err => {})
    }
    setTimeout(() => {
      this.state.save = this.$state.idle;
    }, 1000)
  }
}
  </script>