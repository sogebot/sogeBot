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
          :value.sync="item.command"
          v-bind:placeholder="translate('systems.alias.command.placeholder')"
          v-bind:filters="['global', 'sender', 'param', '!param', 'touser']"
          v-on:update="item.command = $event"></textarea-with-tags>
      </b-form-group>
    </b-form>
  </b-container>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { permission } from 'src/bot/helpers/permissions'

import { AliasInterface } from 'src/bot/database/entity/alias';
import { PermissionsInterface } from 'src/bot/database/entity/permissions';

import { Validations } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators'
import { orderBy } from 'lodash-es'

import { v4 as uuid } from 'uuid';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faKey } from '@fortawesome/free-solid-svg-icons';
library.add(faKey);

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
export default class aliasEdit extends Vue {
  psocket = getSocket('/core/permissions')
  socket = getSocket('/systems/alias');

  state: {
    loading: number;
    save: number;
    pending: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
  }

  permissions: PermissionsInterface[] = [];

  item: AliasInterface = {
    id: uuid(),
    alias: '',
    command: '',
    enabled: true,
    visible: true,
    permission: permission.VIEWERS,
    group: null,
  }


  @Validations()
  validations = {
    item: {
      alias: {required},
      command: {required},
    }
  }

  @Watch('item', { deep: true })
  pending() {
    if (this.state.loading === this.$state.success) {
      this.state.pending = true;
    }
  }

  @Watch('item.alias')
  checkAliasFormat(val) {
    if (!val.startsWith('!')) {
      Vue.set(this.item, 'alias', '!' + val);
    }
  }

  async mounted() {
    await new Promise((resolve) => {
      this.psocket.emit('permissions', (data) => {
      this.permissions = orderBy(data, 'order', 'asc');
      resolve()
      })
    })

    if (this.$route.params.id) {
      await new Promise((resolve, reject) => {
        this.socket.emit('getById', this.$route.params.id, (err, data: AliasInterface) => {
          if (err) {
            reject(err)
          }

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
    this.socket.emit('deleteById', this.$route.params.id, (err) => {
      if (err) {
        return console.error(err);
      }
      this.$router.push({ name: 'aliasManagerList' })
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


  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

      this.socket.emit('setById', this.$route.params.id, this.item, (err, data) => {
        if (err) {
          this.state.save = this.$state.fail;
          return console.error(err);
        }

        console.groupCollapsed('alias::setById')
        console.log({data})
        console.groupEnd();
        this.state.save = this.$state.success;
        this.state.pending = false;
        this.$router.push({ name: 'aliasManagerEdit', params: { id: String(data.id) } })
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

<style>
.alias-edit-btn button {
  padding-left: 0 !important;
}

.alias-edit-btn button .dropdown-icon {
  background: rgba(0,0,0,0.15);
  padding: 0.5rem 0.4rem;
}
</style>