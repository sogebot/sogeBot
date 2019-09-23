<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.customcommands') }}
        </span>
      </b-col>
    </b-row>

    <panel search @search="search = $event" @showAs='showAs = $event'>
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/commands/edit">{{translate('systems.customcommands.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loadingCmd === 1 || state.loadingPerm === 1"/>
    <b-alert show variant="danger" v-else-if="state.loadingCmd === 2 && state.loadingPerm === 2 && commandsFiltered.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.customcommands.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loadingCmd === 2 && state.loadingPerm === 2 && commands.length === 0">
      {{translate('systems.customcommands.empty')}}
    </b-alert>
    <b-table v-else striped small :items="commandsFiltered" :fields="fields" responsive >
      <template v-slot:cell(response)="data">
        <span v-if="data.item.responses.length === 0" class="text-muted">{{ translate('systems.customcommands.no-responses-set') }}</span>
        <template v-for="(r, i) of _.orderBy(data.item.responses, 'order', 'asc')">
          <div :key="i" :style="{ 'margin-top': i !== 0 ? '15px' : 'inherit' }" style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; margin-bottom: -3px;">
            <span style="display: inline-block">
              {{translate('response')}}#{{i + 1}}
            </span>

            <span style="display: inline-block">
              <button data-toggle="dropdown" class="btn btn-outline-dark border-0" style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">
                <fa class="mr-1" icon="key"/>
                <span v-if="getPermissionName(r.permission)">{{ getPermissionName(r.permission) }}</span>
                <span v-else class="text-danger"><fa icon="exclamation-triangle"/> Permission not found</span>
              </button>
              <div class="dropdown-menu" aria-labelledby="permissionsMenuButton">
                <a class="dropdown-item"
                    style="cursor: pointer"
                    v-for="p of permissions"
                    :key="p.id"
                    @click="updatePermission(data.item.id, r._id, p.id)">{{ getPermissionName(p.id) | capitalize }}</a>
              </div>
            </span>

            <span style="display: inline-block">
              <button data-toggle="dropdown" class="btn btn-outline-dark border-0 h-100 w-100" style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;">
                <fa class="mr-1" :icon="r.stopIfExecuted ? 'stop' : 'play'"/>
                {{ translate(r.stopIfExecuted ? 'commons.stop-if-executed' : 'commons.continue-if-executed') | capitalize }}</button>
              <div class="dropdown-menu">
                <a class="dropdown-item" style="cursor: pointer" v-on:click="updateStopIfExecuted(data.item.id, r._id, true)">{{ translate('commons.stop-if-executed') | capitalize }}</a>
                <a class="dropdown-item" style="cursor: pointer" v-on:click="updateStopIfExecuted(data.item.id, r._id, false)">{{ translate('commons.continue-if-executed') | capitalize }}</a>
              </div>
            </span>
          </div>
          <text-with-tags :key="10 + i" v-if='r.filter' v-bind:value='r.filter' style="font-size: .8rem;border: 1px dashed #eee; display: inline-block;padding: 0.1rem; padding-left: 0.3rem; padding-right: 0.3rem;"></text-with-tags>
          <text-with-tags :key="100 + i" v-bind:value='r.response' style="display: inline-block"></text-with-tags>
        </template>
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="text-right" style="width: max-content !important;">
          <button-with-icon :class="[ data.item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-only-icon btn-reverse" icon="power-off" @click="data.item.enabled = !data.item.enabled; sendUpdate(data.item.id)">
            {{ translate('dialog.buttons.' + (data.item.enabled? 'enabled' : 'disabled')) }}
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/commands/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-dark btn-reverse" :icon="['fas', data.item.visible ? 'eye' : 'eye-slash']" @click="data.item.visible = !data.item.visible; sendUpdate(data.item.id)">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="remove(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import _ from 'lodash';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faEyeSlash, faPlay, faStop, faKey } from '@fortawesome/free-solid-svg-icons';
library.add(faEye, faEyeSlash, faPlay, faKey, faStop);

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    toggle: () => import('../../../components/toggle-enable.vue'),
    'text-with-tags': () => import('../../../components/textWithTags.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
  filters: {
    capitalize (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    onlyCommand (val) {
      return val.split(' ')[0]
    },
  }
})
export default class commandsList extends Vue {
  search = '';

  commands: any[] = [];
  permissions: any[] = [];

  changed: any[] = [];
  isDataChanged = false;

  state: {
    loadingCmd: number;
    loadingPerm: number;
  } = {
    loadingCmd: this.$state.progress,
    loadingPerm: this.$state.progress,
  };

  fields = [
    { key: 'command', label: this.translate('command'), sortable: true },
    { key: 'count', label: this.capitalize(this.translate('count')), sortable: true },
    { key: 'response', label: this.translate('response') },
    { key: 'buttons', label: '' },
  ];

  psocket = io('/core/permissions', { query: "token=" + this.token });
  socket = io('/systems/customcommands', { query: "token=" + this.token });

  capitalize (value) {
    if (!value) return ''
    value = value.toString()
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  get commandsFiltered() {
    if (this.search.length === 0) return this.commands
    return this.commands.filter((o) => {
      const isSearchInCommand = !_.isNil(o.command.match(new RegExp(this.search, 'ig')))
      const isSearchInResponse = o.responses.filter(o => {
        return !_.isNil(o.response.match(new RegExp(this.search, 'ig')))
      }).length > 0
      return isSearchInCommand || isSearchInResponse
    })
  };

  created() {
    this.state.loadingCmd = this.$state.progress;
    this.state.loadingPerm = this.$state.progress;
    this.psocket.emit('find', {}, (err, data) => {
      if (err) return console.error(err)
      this.permissions = _.orderBy(data, 'order', 'asc');
      this.state.loadingPerm = this.$state.success;
    })
    this.socket.emit('find.commands', {}, (err, items) => {
      this.commands = _.orderBy(items, 'command', 'asc');
      this.state.loadingCmd = this.$state.success;
    })
  }

  getPermissionName (id) {
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

  updatePermission (cid, rid, permission) {
    let command = this.commands.filter((o) => o.id === cid)[0]
    let response = command.responses.filter((o) => o._id === rid)[0]
    response.permission = permission
    this.socket.emit('update.command', {items: [command]})
    this.$forceUpdate();
  }

  updateStopIfExecuted (cid, rid, stopIfExecuted) {
    let command = this.commands.filter((o) => o.id === cid)[0]
    let response = command.responses.filter((o) => o._id === rid)[0]
    response.stopIfExecuted = stopIfExecuted
    this.socket.emit('update.command', {items: [command]})
    this.$forceUpdate();
  }

  async remove(id) {
    await Promise.all([
      await new Promise(resolve => {
        this.socket.emit('delete', { where: { id } }, () => {
          resolve();
        })
      }),
      await new Promise(resolve => {
        this.socket.emit('delete', { collection: 'responses', where: { cid: id } }, () => {
          resolve();
        })
      }),
    ])
    this.commands = this.commands.filter((o) => o.id !== id)
    this.$router.push({ name: 'CommandsManagerList' });
  }

  sendUpdate (_id) {
    this.socket.emit('update.command', {items: this.commands.filter((o) => o.id === _id)})
  }
}
</script>
