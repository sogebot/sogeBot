<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.settings') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.permissions') }}
        </span>
      </div>
    </div>

    <panel>
      <template v-slot:left>
        <button-with-icon @click="addNewPermissionGroup" class="btn-primary btn-reverse" icon="plus">{{translate('core.permissions.addNewPermissionGroup')}}</button-with-icon>
      </template>

      <template v-slot:right>
        <b-alert show variant="info" v-if="pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save"/>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <div class="row" v-else>
      <div class="col-3">
        <list :permissions.sync="permissions"/>
        <em class="alert-danger p-3 mt-1 d-block">
          <font-awesome-icon icon="exclamation-triangle" size="lg"></font-awesome-icon>
          {{translate('core.permissions.higherPermissionHaveAccessToLowerPermissions')}}
        </em>
      </div>
      <div class="col-9">
        <edit :permissions.sync="permissions"/>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { getSocket } from '../../helpers/socket';
  import { v4 as uuid } from 'uuid';

  import { Route } from 'vue-router'
  import { NextFunction } from 'express';
  import { sortBy } from 'lodash-es';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
  library.add(faExclamationTriangle)

  import { PermissionsInterface } from 'src/bot/database/entity/permissions'
  import { permission } from 'src/bot/helpers/permissions';

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      loading: () => import('../../components/loading.vue'),
      list: () => import('./components/permissions/list.vue'),
      edit: () => import('./components/permissions/edit.vue'),
    },
    data: function () {
      const object: {
        socket: any,
        pending: boolean,
        state: {
          loading: number,
          reorder: number,
          save: number,
        },
        permissions: PermissionsInterface[],
      } = {
        socket: getSocket('/core/permissions'),
        pending: false,
        state: {
          loading: this.$state.progress,
          reorder: this.$state.idle,
          save: this.$state.idle,
        },
        permissions: [],
      }
      return object
    },
    beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
      if (to.name === 'PermissionsSettings') {
        this.reorder(); // reorder on router change or on delete
        next()
      } else {
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
    },
    beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
      if (to.name === 'PermissionsSettings') {
        this.reorder(); // reorder on router change or on delete
        next()
      } else {
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
    },
    mounted() {
      this.socket.emit('permissions', (err: string | null, data: PermissionsInterface[]) => {
        if (err) {
          return console.error(err);
        }
        this.permissions = data;
        this.$nextTick(() => {
          this.state.loading = this.$state.success;
        })
      })
    },
    watch: {
      permissions: {
        deep: true,
        handler(val) {
          if (this.state.loading === this.$state.success) {
            this.pending = true;
          }
        }
      }
    },
    methods: {
      async save() {
        this.state.save = this.$state.progress;
        await new Promise(resolve => {
          this.socket.emit('permission::save', this.permissions, () => {
            resolve();
          });
        });
        this.pending = false;
        this.state.save = this.$state.success;
        window.setTimeout(() => this.state.save = this.$state.idle, 1000);
      },
      reorder() {
        // update orders
        const permissionsToReorder = sortBy(this.permissions.filter(o => o.id !== permission.VIEWERS, 'order'));
        console.log(permissionsToReorder);
        for (let i = 0; i < permissionsToReorder.length; i++) {
          permissionsToReorder[i].order = i;
        }
        const viewers = this.permissions.find(o => o.id === permission.VIEWERS)
        if (viewers) {
          viewers.order = this.permissions.length - 1;
        }
      },
      async addNewPermissionGroup() {
        const id = uuid();
        const data: PermissionsInterface = {
          id,
          name: '',
          isCorePermission: false,
          isWaterfallAllowed: true,
          automation: 'none',
          order: this.permissions.length - 1,
          userIds: [],
          filters: [],
        };
        this.permissions.push(data);
        this.reorder();
        this.$router.push({ name: 'PermissionsSettings', params: { id } }).catch(() => {})
      }
    },
  })
</script>

<style scoped>
</style>