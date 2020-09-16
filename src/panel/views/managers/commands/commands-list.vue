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
      <b-col v-if="!$systems.find(o => o.name === 'customcommands').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event" @showAs='showAs = $event'>
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/commands/edit">{{translate('systems.customcommands.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loadedCmd === 1 || state.loadedPerm === 1"/>
    <b-alert show variant="danger" v-else-if="state.loadedCmd === 2 && state.loadedPerm === 2 && commandsFiltered.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.customcommands.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loadedCmd === 2 && state.loadedPerm === 2 && commands.length === 0">
      {{translate('systems.customcommands.empty')}}
    </b-alert>
    <b-table v-else striped small :items="commandsFiltered" :fields="fields" responsive >
      <template v-slot:cell(response)="data">
        <span v-if="data.item.responses.length === 0" class="text-muted">{{ translate('systems.customcommands.no-responses-set') }}</span>
        <template v-for="(r, i) of orderBy(data.item.responses, 'order', 'asc')">
          <div :key="i" :style="{ 'margin-top': i !== 0 ? '15px' : 'inherit' }" style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; margin-bottom: -3px;">
            <span style="display: inline-block">
              {{translate('response')}}#{{i + 1}}
            </span>

            <span style="display: inline-block">
              <b-dropdown variant="outline-dark" toggle-class="border-0" size="sm">
                <template v-slot:button-content>
                  <fa class="mr-1" icon="key"/>
                  <span v-if="getPermissionName(r.permission, permissions)">{{ getPermissionName(r.permission, permissions) }}</span>
                  <span v-else class="text-danger"><fa icon="exclamation-triangle"/> Permission not found</span>
                </template>
                <b-dropdown-item v-for="p of permissions"
                                :key="p.id"
                                @click="updatePermission(data.item.id, r.id, p.id)">
                  {{ getPermissionName(p.id, permissions) | capitalize }}
                </b-dropdown-item>
              </b-dropdown>
            </span>

            <span style="display: inline-block">
              <b-dropdown variant="outline-dark" toggle-class="border-0" size="sm">
                <template v-slot:button-content>
                  <fa class="mr-1" :icon="r.stopIfExecuted ? 'stop' : 'play'"/>
                  {{ translate(r.stopIfExecuted ? 'commons.stop-if-executed' : 'commons.continue-if-executed') | capitalize }}
                </template>
                <b-dropdown-item @click="updateStopIfExecuted(data.item.id, r.id, true)">
                  {{ translate('commons.stop-if-executed') | capitalize }}
                </b-dropdown-item>
                <b-dropdown-item @click="updateStopIfExecuted(data.item.id, r.id, false)">
                  {{ translate('commons.continue-if-executed') | capitalize }}
                </b-dropdown-item>
              </b-dropdown>
            </span>
          </div>
          <text-with-tags :key="10 + i" v-if='r.filter' :value='r.filter' style="font-size: .8rem;border: 1px dashed #eee; display: inline-block;padding: 0.1rem; padding-left: 0.3rem; padding-right: 0.3rem;"></text-with-tags>
          <text-with-tags :key="100 + i" :value='r.response' style="display: inline-block"></text-with-tags>
        </template>
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="float-right" style="width: max-content !important;">
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
import { defineComponent, ref, onMounted, computed } from '@vue/composition-api'
import type { Ref } from '@vue/composition-api'

import { capitalize, isNil, orderBy } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faExclamationTriangle, faEyeSlash, faPlay, faStop, faKey } from '@fortawesome/free-solid-svg-icons';
library.add(faEye, faEyeSlash, faExclamationTriangle, faPlay, faKey, faStop);

import { getSocket } from '../../../helpers/socket';
import { getPermissionName } from '../../../helpers/getPermissionName';
import type { CommandsInterface } from 'src/bot/database/entity/commands';
import type { PermissionsInterface } from 'src/bot/database/entity/permissions';
import translate from 'src/panel/helpers/translate';
import { ButtonStates } from 'src/panel/helpers/buttonStates';

let count: {
  command: string; count: number;
}[] = [];
const socket = {
  permission: getSocket('/core/permissions'),
  command: getSocket('/systems/customcommands'),
} as const;

export default defineComponent({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'text-with-tags': () => import('../../../components/textWithTags.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
  filters: {
    capitalize (value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    onlyCommand (val: string) {
      return val.split(' ')[0]
    },
  },
  setup(props, context) {
    const search = ref('');
    const commands: Ref<Required<CommandsInterface>[]> = ref([]);
    const permissions: Ref<Required<PermissionsInterface>[]> = ref([]);
    const changed: Ref<any[]> = ref([]);
    const isDataChanged = ref(false);
    const state: Ref<{
      loadedPerm: number;
      loadedCmd: number;
    }> = ref({
      loadedPerm: ButtonStates.progress,
      loadedCmd: ButtonStates.progress,
    });

    const commandsFiltered = computed(() => {
      if (search.value.length === 0) return commands.value
      return commands.value.filter((o) => {
        const isSearchInCommand = !isNil(o.command.match(new RegExp(search.value, 'ig')))
        const isSearchInResponse = o.responses.filter(o => {
          return !isNil(o.response.match(new RegExp(search.value, 'ig')))
        }).length > 0
        return isSearchInCommand || isSearchInResponse
      })
    })

    const fields = [
      { key: 'command', label: translate('command'), sortable: true },
      {
        key: 'count',
        label: capitalize(translate('count')),
        sortable: true,
        sortByFormatted: true,
        sortDirection: 'desc',
        formatter: (value: null, key: undefined, item: Required<CommandsInterface>) => {
          return (count.find(o => o.command === item.command) || { count: 0 }).count
        },
      },
      { key: 'response', label: translate('response') },
      { key: 'buttons', label: '' },
    ];

    onMounted(() => {
      state.value.loadedCmd = ButtonStates.progress;
      state.value.loadedPerm = ButtonStates.progress;
      socket.permission.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
        if(err) {
          return console.error(err);
        }
        permissions.value = data;
        state.value.loadedPerm = ButtonStates.success;
      })
      socket.command.emit('generic::getAll', (err: string | null, commandsGetAll: Required<CommandsInterface>[], countArg: { command: string; count: number }[] ) => {
        if (err) {
          return console.error(err);
        }
        console.debug({ commands, count })
        count = countArg;
        commands.value = commandsGetAll;
        state.value.loadedCmd = ButtonStates.success;
      })
    })

    const updatePermission = (cid: string, rid: string, permission: string) => {
      let command = commands.value.filter((o) => o.id === cid)[0]
      let response = command.responses.filter((o) => o.id === rid)[0]
      response.permission = permission
      socket.command.emit('generic::setById', { id: cid, item: command }, () => {});
      context.root.$forceUpdate();
    }
    const updateStopIfExecuted = (cid: string, rid: string, stopIfExecuted: boolean) => {
      let command = commands.value.filter((o) => o.id === cid)[0]
      let response = command.responses.filter((o) => o.id === rid)[0]
      response.stopIfExecuted = stopIfExecuted
      socket.command.emit('generic::setById', { id: cid, item: command }, () => {});
      context.root.$forceUpdate();
    }
    const remove = async (id: string) => {
      await new Promise(resolve => {
        socket.command.emit('generic::deleteById', id, () => {
          resolve();
        })
      })
      commands.value = commands.value.filter((o) => o.id !== id)
    }
    const sendUpdate = (id: string) => {
      socket.command.emit('generic::setById', { id, item: commands.value.find((o) => o.id === id) }, (err: string | null) => {
        if (err) {
          return console.error(err);
        }
      });
    }

    return {
      orderBy,
      search,
      commands,
      state,
      isDataChanged,
      permissions,
      changed,
      commandsFiltered,
      fields,
      remove,
      sendUpdate,
      updatePermission,
      updateStopIfExecuted,
      getPermissionName,
    }
  },
});
</script>
