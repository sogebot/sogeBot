<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.alias') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'alias').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/alias/edit">{{translate('systems.alias.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loadingAls !== $state.success || state.loadingPrm !== $state.success"/>
    <b-alert show variant="danger" v-else-if="state.loadingAls === $state.success && state.loadingPrm === $state.success && fItems.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.alias.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loadingAls === $state.success && state.loadingPrm === $state.success && items.length === 0">
      {{translate('systems.alias.empty')}}
    </b-alert>
    <b-card v-else no-body v-for="group of groups" v-bind:key="group">
      <b-card-header header-tag="header" class="p-1" role="tab">
        <div class="d-flex">
          <b-button block v-b-toggle="'alias-accordion-' + group" variant="dark" class="text-left">
            {{group === null ? 'Unnassigned group' : group }} ({{ fItems.filter(o => o.group === group).length }})
          </b-button>
            <hold-button @trigger="removeGroup(group)" icon="trash" class="btn-danger btn-reverse btn-only-icon" v-if="group !== null">
              <template slot="icon">
                <font-awesome-layers>
                  <fa icon="slash" transform="down-1" :mask="['fas', 'object-group']" />
                  <fa icon="slash" transform="up-1 left-1"/>
                </font-awesome-layers>
              </template>
              <template slot="title">{{translate('dialog.buttons.delete')}}</template>
              <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
            </hold-button>
        </div>
      </b-card-header>
      <b-collapse :id="'alias-accordion-' + group" accordion="alias-accordion" role="tabpanel" :visible="group === null">
        <b-card-body>
          <b-table striped small hover :items="fItems.filter(o => o.group === group)" :fields="fields" @row-clicked="linkTo($event)" >
            <template v-slot:cell(buttons)="data">
              <div class="float-right" style="width: max-content !important;">
                <button-with-icon :class="[ data.item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-only-icon btn-reverse" icon="power-off" @click="data.item.enabled = !data.item.enabled; update(data.item)">
                  {{ translate('dialog.buttons.' + (data.item.enabled? 'enabled' : 'disabled')) }}
                </button-with-icon>
                <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/alias/edit/' + data.item.id">
                  {{ translate('dialog.buttons.edit') }}
                </button-with-icon>
                <b-dropdown no-caret class="alias-table-btn">
                  <template v-slot:button-content><fa icon="key" fixed-width/></template>
                  <b-dropdown-item
                    v-for="permission of permissions"
                    :key="data.item.id + permission.id"
                    @click="updatePermission(data.item.id, permission.id)">
                    {{ permission.name }}
                  </b-dropdown-item>
                </b-dropdown>
                <b-dropdown no-caret class="alias-table-btn">
                  <template v-slot:button-content><fa icon="object-group" fixed-width/></template>
                  <b-dropdown-item
                    v-for="group of groups"
                    :key="data.item.id + group"
                    @click="updateGroup(data.item.id, group)">
                    {{ group === null ? 'Unnassigned group' : group }}
                  </b-dropdown-item>
                  <b-dropdown-divider/>
                  <b-dropdown-item
                    v-b-modal.create-new-group
                    @click="newGroupForAliasId = data.item.id"
                    :key="data.item.id + 'newgroup'">
                    Add new group
                  </b-dropdown-item>
                </b-dropdown>
                <button-with-icon class="btn-only-icon btn-dark btn-reverse" :icon="['fas', data.item.visible ? 'eye' : 'eye-slash']" @click="data.item.visible = !data.item.visible; update(data.item)">
                  {{ translate('dialog.buttons.edit') }}
                </button-with-icon>
                <hold-button @trigger="remove(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
                  <template slot="title">{{translate('dialog.buttons.delete')}}</template>
                  <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
                </hold-button>
              </div>
            </template>
          </b-table>
        </b-card-body>
      </b-collapse>
    </b-card>

    <b-modal id="create-new-group" title="New group name" centered
      @show="resetModal"
      @hidden="resetModal"
      @ok="handleOk">
      <form ref="form" @submit.stop.prevent="handleSubmit">
        <b-form-group
          :state="newGroupNameValidity"
          label="Name"
          label-for="name-input"
          invalid-feedback="Name is required"
        >
          <b-form-input
            id="name-input"
            v-model="newGroupName"
            :state="newGroupNameValidity"
            @keydown="newGroupNameUpdated = true"
            required
          ></b-form-input>
        </b-form-group>
      </form>
    </b-modal>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, getCurrentInstance, computed } from '@vue/composition-api'
import type { Ref } from '@vue/composition-api'

import { getSocket } from 'src/panel/helpers/socket';
import { getPermissionName } from 'src/panel/helpers/getPermissionName';

import { AliasInterface } from 'src/bot/database/entity/alias';
import { PermissionsInterface } from 'src/bot/database/entity/permissions';

import { orderBy, isNil } from 'lodash-es';
import { escape } from 'xregexp';
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'

import { library } from '@fortawesome/fontawesome-svg-core';
import { faKey, faObjectGroup } from '@fortawesome/free-solid-svg-icons';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import translate from 'src/panel/helpers/translate';
library.add(faKey, faObjectGroup);

const socket = {
  permission: getSocket('/core/permissions'),
  alias: getSocket('/systems/alias'),
} as const;

export default defineComponent({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'font-awesome-layers': FontAwesomeLayers,
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
  setup(props, context) {
    const instance = getCurrentInstance();

    const items: Ref<AliasInterface[]> = ref([]);
    const permissions: Ref<PermissionsInterface[]> = ref([]);

    const newGroupForAliasId = ref('');
    const newGroupName = ref('');
    const newGroupNameUpdated = ref(false);

    const search = ref('');
    const state: Ref<{
      loadingAls: number;
      loadingPrm: number;
    }> = ref({
      loadingAls: ButtonStates.progress,
      loadingPrm: ButtonStates.idle,
    });

    const newGroupNameValidity = computed(() => {
      if (newGroupNameUpdated.value) {
        return newGroupName.value.length > 0;
      } else {
        return null;
      }
    });
    const groups = computed(() => {
      return [null, ...new Set(items.value.filter(o => o.group !== null).map(o => o.group).sort())];
    });
    const fItems = computed(() => {
      if (search.value.length === 0) return items.value
      return items.value.filter((o) => {
        const isSearchInAlias = !isNil(o.alias.match(new RegExp(escape(search.value), 'ig')))
        const isSearchInCommand = !isNil(o.command.match(new RegExp(escape(search.value), 'ig')))
        return isSearchInAlias || isSearchInCommand
      })
    });

    const fields = [
      { key: 'alias', label: translate('alias'), sortable: true },
      { key: 'command', label: translate('command'), sortable: true },
      {
        key: 'permission',
        label: translate('permission'),
        sortable: true,
        formatter: (value: string, key: string, item: typeof items.value[number]) => {
          return getPermissionName(value, permissions.value);
        },
        sortByFormatted: true,
      },
      { key: 'buttons', label: '' },
    ];

    onMounted(() => {
      state.value.loadingAls = ButtonStates.progress;
      state.value.loadingPrm = ButtonStates.progress;
      socket.permission.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
        if(err) {
          return error(err);
        }
        permissions.value = data;
        state.value.loadingPrm = ButtonStates.success;
      })
      socket.alias.emit('generic::getAll', (err: string | null, itemsGetAll: typeof items.value) => {
        items.value = orderBy(itemsGetAll, 'alias', 'asc');
        state.value.loadingAls = ButtonStates.success;
      })
    })
    const removeGroup = async (group: AliasInterface['group']) => {
      let promises: Promise<void>[] = [];
      for (const item of items.value.filter((o) => o.group === group)) {
        item.group = null;
        promises.push(new Promise(resolve => {
          socket.alias.emit('generic::setById', { id: item.id, item }, () => {
            resolve();
          })
        }))
      }
      await Promise.all(promises);
      context.root.$forceUpdate();
    }
    const updateGroup = (id: string, group: AliasInterface['group']) => {
      let item = items.value.find((o) => o.id === id)
      if (item) {
        item.group = group
        socket.alias.emit('generic::setById', { id: item.id, item }, () => {})
        context.root.$forceUpdate();
      }
    }
    const updatePermission = (id: string, permission: string) => {
      let item = items.value.filter((o) => o.id === id)[0]
      item.permission = permission
      socket.alias.emit('generic::setById', { id: item.id, item }, () => {})
      context.root.$forceUpdate();
    }
    const linkTo = (item: Required<AliasInterface>) => {
      console.debug('Clicked', item.id);
      context.root.$router.push({ name: 'aliasManagerEdit', params: { id: item.id } }).catch(() => {});
    }
    const remove = (id: string) => {
      socket.alias.emit('generic::deleteById', id, () => {
        items.value = items.value.filter((o) => o.id !== id)
      })
    }
    const update = (item: typeof items.value[number]) => {
      socket.alias.emit('generic::setById', { id: item.id, item }, () => {})
    }
    const resetModal = () => {
      newGroupName.value = '';
      newGroupNameUpdated.value = false;
    }
    const handleOk = (bvModalEvt: Event) => {
      // Prevent modal from closing
      bvModalEvt.preventDefault()
      // Trigger submit handler
      handleSubmit()
    }
    const handleSubmit = () => {
      if (!newGroupNameValidity.value) {
        return;
      }

      updateGroup(newGroupForAliasId.value, newGroupName.value);
      // Hide the modal manually
      context.root.$nextTick(() => {
        instance?.$bvModal.hide('create-new-group')
      })
    }

    return {
      items,
      permissions,
      newGroupForAliasId,
      newGroupName,
      newGroupNameUpdated,
      search,
      state,
      fields,
      newGroupNameValidity,
      groups,
      fItems,
      removeGroup,
      updateGroup,
      updatePermission,
      linkTo,
      remove,
      update,
      resetModal,
      handleOk,
      handleSubmit,
    }
  }
})
</script>

<style>
.alias-table-btn button {
  padding: 6px !important;
}
</style>
