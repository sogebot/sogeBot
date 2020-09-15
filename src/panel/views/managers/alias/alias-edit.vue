<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.alias') }}
          <template v-if="$route.params.id">
            <small><fa icon="angle-right"/></small>
            {{item.alias}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/alias/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" icon="power-off" @click="item.enabled = !item.enabled">
          {{ translate('dialog.buttons.' + (item.enabled? 'enabled' : 'disabled')) }}
        </button-with-icon>
        <button-with-icon :class="[ item.visible ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" :icon="item.visible ? 'eye' : 'eye-slash'" @click="item.visible = !item.visible">
          {{ translate((item.visible? 'visible' : 'hidden')) | capitalize }}
        </button-with-icon>
        <b-dropdown no-caret class="alias-edit-btn">
          <template v-slot:button-content>
            <span class="dropdown-icon">
              <fa icon="key" fixed-width/>
            </span>
            {{ getPermissionName(item.permission) }}
          </template>
          <b-dropdown-item
            v-for="permission of permissions"
            :key="permission.id"
            @click="item.permission = permission.id">
            {{ permission.name }}
          </b-dropdown-item>
        </b-dropdown>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <b-form v-else>
      <b-form-group
        :label="translate('systems.alias.alias.name')"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model="item.alias"
            type="text"
            :placeholder="translate('systems.alias.alias.placeholder')"
            @input="$v.item.alias.$touch()"
            :state="$v.item.alias.$invalid && $v.item.alias.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.alias.$invalid && $v.item.alias.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>

      <b-form-group>
        <label>{{ translate('systems.alias.command.name') }}</label>
        <textarea-with-tags
          @input="$v.item.command.$touch()"
          :value.sync="item.command"
          :placeholder="translate('systems.alias.command.placeholder')"
          v-bind:filters="['global', 'sender', 'param', '!param', 'touser']"
          :state="$v.item.command.$invalid && $v.item.command.$dirty ? false : null"
          v-on:update="item.command = $event"></textarea-with-tags>
        <b-form-invalid-feedback :state="!($v.item.command.$invalid && $v.item.command.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>
    </b-form>
  </b-container>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted, watch, getCurrentInstance } from '@vue/composition-api'
import type { Ref } from '@vue/composition-api'

import { getSocket } from 'src/panel/helpers/socket';
import { permission } from 'src/bot/helpers/permissions'
import { ButtonStates } from 'src/panel/helpers/buttonStates';

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { AliasInterface } from 'src/bot/database/entity/alias';
import { PermissionsInterface } from 'src/bot/database/entity/permissions';

import { validationMixin } from 'vuelidate'
import { required } from 'vuelidate/lib/validators'
import { orderBy } from 'lodash-es'

import { v4 as uuid } from 'uuid';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faKey } from '@fortawesome/free-solid-svg-icons';
library.add(faKey);

const socket = {
  permission: getSocket('/core/permissions'),
  alias: getSocket('/systems/alias'),
} as const;

export default defineComponent({
  mixins: [ validationMixin ],
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize(value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  },
  validations: {
    item: {
      alias: {required},
      command: {required},
    }
  },
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
  },
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
  },
  setup(props, context) {
    const instance = getCurrentInstance();
    const state: Ref<{
      loading: number;
      save: number;
      pending: boolean;
    }> = ref({
      loading: ButtonStates.progress,
      save: ButtonStates.idle,
      pending: false,
    });
    const permissions: Ref<PermissionsInterface[]> = ref([]);
    const item: Ref<AliasInterface> = ref({
      id: uuid(),
      alias: '',
      command: '',
      enabled: true,
      visible: true,
      permission: permission.VIEWERS,
      group: null,
    });

    watch(item, () => {
      if (state.value.loading === ButtonStates.success) {
        state.value.pending = true;
      }
    }, { deep: true });
    watch(() => item.value.alias, (value) => {
      if (value.length > 0) {
        if (!value.startsWith('!')) {
          item.value.alias = '!' + value;
        }
      }
    });

    onMounted(async () => {
      await new Promise((resolve) => {
        socket.permission.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
          if(err) {
            return console.error(err);
          }
          permissions.value = orderBy(data, 'order', 'asc');
          resolve()
        })
      })

      if (context.root.$route.params.id) {
        await new Promise((resolve, reject) => {
          socket.alias.emit('generic::getOne', context.root.$route.params.id, (err: string | null, data: AliasInterface) => {
            if (err) {
              reject(err)
            }

            item.value = data
            resolve();
          })
        })
      }

      context.root.$nextTick(() => {
        state.value.loading = ButtonStates.success;
      })
    });

    const del = () => {
      socket.alias.emit('generic::deleteById', context.root.$route.params.id, (err: string | null) => {
        if (err) {
          return console.error(err);
        }
        context.root.$router.push({ name: 'aliasManagerList' })
      });
    }
    const getPermissionName = (id: string | null) => {
      if (!id) return 'Disabled'
      const permission = permissions.value.find((o) => {
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
    const save = () =>  {
      const $v = instance?.$v;
      console.log({instance, $v})
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;

        socket.alias.emit('generic::setById', { id: context.root.$route.params.id, item: item.value }, (err: string | null, data: typeof item.value) => {
          if (err) {
            state.value.save = ButtonStates.fail;
            return console.error(err);
          }

          console.groupCollapsed('generic::setById')
          console.log({data})
          console.groupEnd();
          state.value.save = ButtonStates.success;
          state.value.pending = false;
          context.root.$router.push({ name: 'aliasManagerEdit', params: { id: String(data.id) } }).catch(() => {});
          setTimeout(() => {
            state.value.save = ButtonStates.idle;
          }, 1000)
        });
      }
  }

    return {
      state,
      permissions,
      item,
      del,
      getPermissionName,
      save,
    }
  }
});
</script>

<style>
.alias-edit-btn button {
  padding-left: 0 !important;
}

.alias-edit-btn button .dropdown-icon {
  background: rgba(0,0,0,0.15);
  padding: 0.5rem 0.4rem;
}
</style>