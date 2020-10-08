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
        <button-with-icon class="btn-primary btn-reverse" icon="plus" @click="newItem">{{translate('systems.customcommands.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loadedCmd === 1 || state.loadedPerm === 1"/>
    <template v-else>
      <b-sidebar
        @change="isSidebarVisibleChange"
        :visible="isSidebarVisible"
        :no-slide="!sidebarSlideEnabled"
        width="1200px"
        no-close-on-route-change
        shadow
        no-header
        right
        backdrop>
        <template v-slot:footer="{ hide }">
          <div class="d-flex bg-opaque align-items-center px-3 py-2 border-top border-gray" style="justify-content: flex-end">
            <b-button class="mx-2" @click="hide" variant="link">{{ translate('dialog.buttons.close') }}</b-button>
            <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
          </div>
        </template>
        <div class="px-3 py-2">
          <b-form>
            <b-form-group :label="translate('systems.customcommands.command.name')" label-for="name">
              <template v-if="editationItem">
              <b-input-group>
                  <b-form-input
                    id="name"
                    v-model="editationItem.command"
                    type="text"
                    :placeholder="translate('systems.customcommands.command.placeholder')"
                    @input="$v.editationItem.command.$touch()"
                    :state="$v.editationItem.command.$invalid && $v.editationItem.command.$dirty ? false : null"
                  ></b-form-input>
                </b-input-group>
                <b-form-invalid-feedback
                  :state="!($v.editationItem.command.$invalid && $v.editationItem.command.$dirty)"
                >{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
              </template>
              <b-skeleton v-else type="input" class="w-100"></b-skeleton>
            </b-form-group>

            <b-form-group>
              <template v-if="editationItem">
                <label>{{ translate('systems.customcommands.response.name') }}</label>
                <div
                  style="display: flex; flex: 1 1 auto"
                  :key="i"
                  :class="[i !== 0 ? 'pt-2' : '']"
                  v-for="(response, i) of orderBy(editationItem.responses, 'order', 'asc')"
                >
                  <textarea-with-tags
                    :value.sync="response.response"
                    v-bind:placeholder="translate('systems.customcommands.response.placeholder')"
                    v-bind:filters="['global', 'sender', 'param', '!param', 'touser']"
                    v-on:update="response.response = $event"
                    :state="true"
                  ></textarea-with-tags>
                  <textarea-with-tags
                    :value.sync="response.filter"
                    v-bind:placeholder="translate('systems.customcommands.filter.placeholder')"
                    v-on:update="response.filter = $event"
                    v-bind:filters="['sender', 'source', 'haveParam', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'rank', 'game', 'language', 'title', 'views', 'followers', 'hosts', 'subscribers']"
                    :state="true"
                  ></textarea-with-tags>
                  <div class="h-auto w-auto" style="flex-shrink: 0;">
                    <b-dropdown variant="outline-dark" toggle-class="border-0 h-auto w-auto" class="h-100">
                      <template v-slot:button-content>
                        <fa class="mr-1" icon="key" />
                        <span
                          v-if="getPermissionName(response.permission, permissions)"
                        >{{ getPermissionName(response.permission, permissions) }}</span>
                        <span v-else class="text-danger">
                          <fa icon="exclamation-triangle" />Permission not found
                        </span>
                      </template>
                      <b-dropdown-item
                        v-for="p of permissions"
                        :key="p.id"
                        @click="response.permission = p.id; state.pending = true;"
                      >{{ getPermissionName(p.id, permissions) | capitalize }}</b-dropdown-item>
                    </b-dropdown>
                  </div>
                  <div class="h-auto w-auto" style="flex-shrink: 0;">
                    <b-dropdown variant="outline-dark" toggle-class="border-0 h-auto w-auto" class="h-100">
                      <template v-slot:button-content>
                        <fa class="mr-1" :icon="response.stopIfExecuted ? 'stop' : 'play'" />
                        {{ translate(response.stopIfExecuted ? 'commons.stop-if-executed' : 'commons.continue-if-executed') | capitalize }}
                      </template>
                      <b-dropdown-item
                        @click="response.stopIfExecuted = true; state.pending = true"
                      >{{ translate('commons.stop-if-executed') | capitalize }}</b-dropdown-item>
                      <b-dropdown-item
                        @click="response.stopIfExecuted = false; state.pending = true"
                      >{{ translate('commons.continue-if-executed') | capitalize }}</b-dropdown-item>
                    </b-dropdown>
                  </div>

                  <div class="h-auto w-auto" style="flex-shrink: 0;">
                    <b-dropdown
                      variant="outline-dark"
                      toggle-class="border-0 h-auto w-auto"
                      class="h-100"
                      no-caret
                    >
                      <template v-slot:button-content>
                        <fa icon="ellipsis-v"></fa>
                      </template>
                      <b-dropdown-item v-if="i !== 0" @click="moveUpResponse(response.order)">
                        <fa icon="sort-up" fixed-width></fa>
                        {{ translate('commons.moveUp') | capitalize }}
                      </b-dropdown-item>
                      <b-dropdown-item
                        v-if="i !== editationItem.responses.length - 1"
                        @click="moveDownResponse(response.order)"
                      >
                        <fa icon="sort-down" fixed-width></fa>
                        {{ translate('commons.moveDown') | capitalize }}
                      </b-dropdown-item>
                      <b-dropdown-item @click="deleteResponse(response.order)">
                        <fa icon="trash-alt" fixed-width></fa>
                        {{ translate('delete') }}
                      </b-dropdown-item>
                    </b-dropdown>
                  </div>
                </div>
                <button
                  class="btn btn-primary btn-block mt-2"
                  type="button"
                  @click="editationItem.responses.push({ filter: '', order: editationItem.responses.length, response: '', stopIfExecuted: false, permission: orderBy(permissions, 'order', 'asc').pop().id })"
                >{{ translate('systems.customcommands.addResponse') }}</button>
              </template>
              <b-skeleton v-else type="input" class="w-100" style="height: 600px !important"></b-skeleton>
            </b-form-group>
          </b-form>
        </div>
      </b-sidebar>
      <b-alert show variant="danger" v-if="commandsFiltered.length === 0 && search.length > 0">
        <fa icon="search"/> <span v-html="translate('systems.customcommands.emptyAfterSearch').replace('$search', search)"/>
      </b-alert>
      <b-alert show v-else-if="commands.length === 0">
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
            <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="history" @click="resetCount(data.item.id)">
              {{ translate('dialog.buttons.reset') }}
            </button-with-icon>
            <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(data.item.id)">
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch, getCurrentInstance } from '@vue/composition-api'
import { v4 as uuid } from 'uuid';

import { capitalize, isNil, orderBy } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faEye, faExclamationTriangle, faEyeSlash, faPlay, faStop, faKey } from '@fortawesome/free-solid-svg-icons';
library.add(faEye, faEyeSlash, faExclamationTriangle, faPlay, faKey, faStop);

import { getSocket } from '../../helpers/socket';
import { getPermissionName } from '../../helpers/getPermissionName';
import type { CommandsInterface } from 'src/bot/database/entity/commands';
import type { PermissionsInterface } from 'src/bot/database/entity/permissions';
import translate from 'src/panel/helpers/translate';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { validationMixin } from 'vuelidate'
import { required, minLength } from 'vuelidate/lib/validators'

let count: {
  command: string; count: number;
}[] = [];
const socket = {
  permission: getSocket('/core/permissions'),
  command: getSocket('/systems/customcommands'),
} as const;

export default defineComponent({
  mixins: [ validationMixin ],
  components: {
    loading: () => import('../../components/loading.vue'),
    'text-with-tags': () => import('../../components/textWithTags.vue'),
    'hold-button': () => import('../../components/holdButton.vue'),
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
  validations: {
    editationItem: {
      command: {
        required,
        sw: (value: string) => value.startsWith('!'),
        minLength: minLength(2),
      },
    }
  },
  setup(props, ctx) {
    const instance = getCurrentInstance();
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const search = ref('');
    const commands = ref([] as Required<CommandsInterface>[]);
    const permissions = ref([] as Required<PermissionsInterface>[]);
    const editationItem = ref(null as CommandsInterface | null);
    const isDataChanged = ref(false);
    const state = ref({
      loadedPerm: ButtonStates.progress,
      loadedCmd: ButtonStates.progress,
      save: ButtonStates.idle,
      pending: false,
    } as {
      loadedPerm: number;
      loadedCmd: number;
      save: number;
      pending: boolean;
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

    watch(() => ctx.root.$route.params.id, (val) => {
      const $v = instance?.$v;
      $v?.$reset();
      if (val) {
        isSidebarVisible.value = true;
      } else {
        state.value.pending = false;
      }
    })
    watch(editationItem, (val, oldVal) => {
      if (val !== null && oldVal !== null) {
        state.value.pending = true;
      }
    }, { deep: true });

    const refresh = () => {
      socket.permission.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
        if(err) {
          return error(err);
        }
        permissions.value = data;
        state.value.loadedPerm = ButtonStates.success;
      })
      socket.command.emit('generic::getAll', (err: string | null, commandsGetAll: Required<CommandsInterface>[], countArg: { command: string; count: number }[] ) => {
        if (err) {
          return error(err);
        }
        console.debug({ commands, count })
        count = countArg;
        commands.value = commandsGetAll;
        state.value.loadedCmd = ButtonStates.success;
      })
    }

    onMounted(() => {
      refresh();
      loadEditationItem();
      if (ctx.root.$route.params.id) {
        isSidebarVisible.value = true;
      }
    });

    const updatePermission = (cid: string, rid: string, permission: string) => {
      let command = commands.value.filter((o) => o.id === cid)[0]
      let response = command.responses.filter((o) => o.id === rid)[0]
      response.permission = permission
      socket.command.emit('generic::setById', { id: cid, item: command }, () => {});
      ctx.root.$forceUpdate();
    }
    const updateStopIfExecuted = (cid: string, rid: string, stopIfExecuted: boolean) => {
      let command = commands.value.filter((o) => o.id === cid)[0]
      let response = command.responses.filter((o) => o.id === rid)[0]
      response.stopIfExecuted = stopIfExecuted
      socket.command.emit('generic::setById', { id: cid, item: command }, () => {});
      ctx.root.$forceUpdate();
    }
    const newItem = () => {
      ctx.root.$router.push({ name: 'CommandsManagerEdit', params: { id: uuid() } }).catch(() => {});
    };
    const sendUpdate = (id: string) => {
      socket.command.emit('generic::setById', { id, item: commands.value.find((o) => o.id === id) }, (err: string | null) => {
        if (err) {
          return error(err);
        }
      });
    }
    const isSidebarVisibleChange = (isVisible: boolean, ev: any) => {
      if (!isVisible) {
        if (state.value.pending) {
          const isOK = confirm('You will lose your pending changes. Do you want to continue?')
          if (!isOK) {
            sidebarSlideEnabled.value = false;
            isSidebarVisible.value = false;
            ctx.root.$nextTick(() => {
              isSidebarVisible.value = true;
              setTimeout(() => {
                sidebarSlideEnabled.value = true;
              }, 300);
            });
            return;
          }
        }
        isSidebarVisible.value = isVisible;
        ctx.root.$router.push({ name: 'CommandsManagerList' }).catch(() => {});
      } else {
        if (sidebarSlideEnabled.value) {
          editationItem.value = null
          loadEditationItem();
        }
      }
    }
    const loadEditationItem = () => {
      if (ctx.root.$route.params.id) {
        socket.command.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, data: CommandsInterface) => {
          if (err) {
            return error(err);
          }
          console.debug({data})
          if (data === null) {
            // we are creating new item
            editationItem.value = {
              id: ctx.root.$route.params.id,
              command: '',
              enabled: true,
              visible: true,
              responses: [],
            }
          } else {
            editationItem.value = data;
          }
        })
      } else {
        editationItem.value = null;
      }
    }
    const save = async () => {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;
        await new Promise((resolve, reject) => {
          console.debug('Saving command', editationItem.value);
          socket.command.emit('generic::setById', { id: editationItem.value?.id, item: editationItem.value }, (err: string | null) => {
            if (err) {
              state.value.save = ButtonStates.fail;
              reject(error(err));
            }
            resolve()
          });
        });

        state.value.save = ButtonStates.success;
        ctx.root.$nextTick(() => {
          refresh();
          state.value.pending = false;
          ctx.root.$router.push({ name: 'CommandsManagerEdit', params: { id: editationItem.value?.id || '' } }).catch(err => {})
        });
      }
      setTimeout(() => {
        state.value.save = ButtonStates.idle;
      }, 1000)
    }
    const del = (id: string) => {
      if (confirm('Do you want to delete custom command ' + commands.value.find(o => o.id === id)?.command + '?')) {
        socket.command.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        })
      }
    }
    const resetCount = (id: string) => {
      if (confirm('Do you want to reset count for custom command ' + commands.value.find(o => o.id === id)?.command + '?')) {
        const item = commands.value.find(o => o.id === id);
        if (item) {
          socket.command.emit('commands::resetCountByCommand', item.command, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        })
        }
      }
    }
    const deleteResponse = (order: number) => {
      let i = 0
      if (editationItem.value) {
        editationItem.value.responses = editationItem.value.responses?.filter(o => o.order !== order)
        orderBy(editationItem.value.responses, 'order', 'asc').map((o) => {
          o.order = i++
          return o
        })
      }
    }

    return {
      orderBy,
      search,
      commands,
      state,
      isDataChanged,
      permissions,
      commandsFiltered,
      fields,
      sendUpdate,
      updatePermission,
      updateStopIfExecuted,
      getPermissionName,
      editationItem,
      sidebarSlideEnabled,
      isSidebarVisibleChange,
      isSidebarVisible,
      save,
      newItem,
      del,
      deleteResponse,
      resetCount
    }
  },
});
</script>
