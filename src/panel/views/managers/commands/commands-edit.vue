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
            {{item.command}}
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
        <b-input-group>
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
            v-bind:filters="['sender', 'haveParam', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'rank', 'game', 'language', 'title', 'views', 'followers', 'hosts', 'subscribers']"></textarea-with-tags>
          <div class="h-auto w-auto" style="flex-shrink: 0;">
            <b-dropdown variant="outline-dark" toggle-class="border-0 h-auto w-auto" class="h-100">
              <template v-slot:button-content>
                <fa class="mr-1" icon="key"/>
                <span v-if="getPermissionName(response.permission)">{{ getPermissionName(response.permission) }}</span>
                <span v-else class="text-danger"><fa icon="exclamation-triangle"/> Permission not found</span>
              </template>
              <b-dropdown-item v-for="p of permissions"
                              :key="p.id"
                              @click="response.permission = p.id; pending = true;">
                {{ getPermissionName(p.id) | capitalize }}
              </b-dropdown-item>
            </b-dropdown>
          </div>
          <div class="h-auto w-auto" style="flex-shrink: 0;">
            <b-dropdown variant="outline-dark" toggle-class="border-0 h-auto w-auto" class="h-100">
              <template v-slot:button-content>
                <fa class="mr-1" :icon="response.stopIfExecuted ? 'stop' : 'play'"/>
                {{ translate(response.stopIfExecuted ? 'commons.stop-if-executed' : 'commons.continue-if-executed') | capitalize }}
              </template>
              <b-dropdown-item @click="response.stopIfExecuted = true; pending = true">
                {{ translate('commons.stop-if-executed') | capitalize }}
              </b-dropdown-item>
              <b-dropdown-item @click="response.stopIfExecuted = false; pending = true">
                {{ translate('commons.continue-if-executed') | capitalize }}
              </b-dropdown-item>
            </b-dropdown>
          </div>

          <div class="h-auto w-auto" style="flex-shrink: 0;">
            <b-dropdown variant="outline-dark" toggle-class="border-0 h-auto w-auto" class="h-100" no-caret>
              <template v-slot:button-content>
                <fa icon="ellipsis-v"></fa>
              </template>
              <b-dropdown-item v-if="i !== 0" @click="moveUpResponse(response.order)">
                <fa icon="sort-up" fixed-width></fa> {{ translate('commons.moveUp') | capitalize }}
              </b-dropdown-item>
              <b-dropdown-item v-if="i !== item.responses.length - 1" @click="moveDownResponse(response.order)">
                <fa icon="sort-down" fixed-width></fa> {{ translate('commons.moveDown') | capitalize }}
              </b-dropdown-item>
              <b-dropdown-item @click="deleteResponse(response.order)">
                <fa icon="trash-alt" fixed-width></fa> {{ translate('delete') }}
              </b-dropdown-item>
            </b-dropdown>
          </div>
        </div>
        <button class="btn btn-primary btn-block mt-2" type="button" @click="item.responses.push({ filter: '', order: item.responses.length, response: '', stopIfExecuted: false, permission: orderBy(permissions, 'order', 'asc').pop().id })">{{ translate('systems.customcommands.addResponse') }}</button>
      </b-form-group>

      <b-form-group>
        <b-row>
          <b-col>
            <label>{{ translate('count') }}</label>
            <input type="number" class="form-control" v-model="count" readonly="true">
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

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { Validations } from 'vuelidate-property-decorators';
import { required, minLength } from 'vuelidate/lib/validators';

import { v4 as uuid } from 'uuid';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle, faPlay, faStop, faKey, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
library.add(faExclamationTriangle, faPlay, faKey, faStop, faSortUp, faSortDown);

import { CommandsInterface } from 'src/bot/database/entity/commands';
import { PermissionsInterface } from 'src/bot/database/entity/permissions';

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
    capitalize(value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class CommandsEdit extends Vue {
  orderBy = orderBy;


  item: Required<CommandsInterface> = {
    id: uuid(),
    command: '',
    enabled: true,
    visible: true,
    responses: [],
  }
  count: number = 0;
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
      command: {
        required,
        sw: (value: string) => value.startsWith('!'),
        minLength: minLength(2),
      },
    }
  }

  beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
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

  beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
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
    this.psocket.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
  if(err) {
    return console.error(err);
  }
      this.permissions = data
      this.state.loadedPerm = this.$state.success;
    });

    if (this.$route.params.id) {
      this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, data: Required<CommandsInterface>, count: number) => {
        console.debug('Loaded', {data})
        // add empty filter if undefined
        for (let i = 0, length = data.responses.length; i < length; i++) {
          if (!data.responses[i].filter) data.responses[i].filter = ''
        }
        this.item = data;
        this.count = count;
        this.$nextTick(() => { this.pending = false })
        this.state.loadedCmd = this.$state.success;
      })
    } else {
      this.state.loadedCmd = this.$state.success;
    }
  }

  getPermissionName(id: string | null) {
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

  moveUpResponse(order: number) {
    this.item.responses.filter((o) => o.order === order - 1 || o.order === order).map(o => {
      if (o.order === order - 1) o.order++
      else o.order--
      return o
    })
  }

  moveDownResponse(order: number) {
    this.item.responses.filter((o) => o.order === order + 1 || o.order === order).map(o => {
      if (o.order === order + 1) o.order--
      else o.order++
      return o
    })
  }

  deleteResponse(order: number) {
    let i = 0
    this.item.responses = this.item.responses.filter(o => o.order !== order)
    orderBy(this.item.responses, 'order', 'asc').map((o) => {
      o.order = i++
      return o
    })
  }

  resetCount() {
    this.count = 0
    this.pending = true
  }

  async remove() {
    this.socket.emit('generic::deleteById', this.$route.params.id, () => {
      this.$router.push({ name: 'CommandsManagerList' });
    });
  }

  async save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;
      await new Promise((resolve, reject) => {
        console.debug('Saving command', this.item);
        this.socket.emit('generic::setById', { id: this.item.id, item: this.item }, (err: string | null) => {
          if (err) {
            this.state.save = this.$state.fail;
            reject(console.error(err));
          }
          resolve()
        });
      });
      await new Promise((resolve, reject) => {
        if (this.count === 0) {
          console.debug('Resetting count');
          this.socket.emit('commands::resetCountByCommand', this.item.command, (err: string | null) => {
          if (err) {
            this.state.save = this.$state.fail;
            reject(console.error(err));
          }
          resolve()
        });
        } else {
          resolve()
        }
      })

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