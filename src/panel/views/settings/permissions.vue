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
    </panel>

    <div class="row">
      <div class="col-3">
        <list :update="update" @update="update = Date.now()"></list>
        <em class="alert-danger p-3 mt-1 d-block">
          <font-awesome-icon icon="exclamation-triangle" size="lg"></font-awesome-icon>
          {{translate('core.permissions.higherPermissionHaveAccessToLowerPermissions')}}
        </em>
      </div>
      <div class="col-9">
        <edit :update="update" @delete="update = Date.now()" @update="update = Date.now()" @pending="pending = $event"></edit>
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

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
  library.add(faExclamationTriangle)

  import { PermissionsInterface } from 'src/bot/database/entity/permissions'
  import { permission } from 'src/bot/helpers/permissions';

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      list: () => import('./components/permissions/list.vue'),
      edit: () => import('./components/permissions/edit.vue'),
    },
    data: function () {
      const object: {
        update: number,
        socket: any,
        pending: boolean,
      } = {
        update: Date.now(),
        socket: getSocket('/core/permissions'),
        pending: false,
      }
      return object
    },
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
    },
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
    },
    watch: {
      $route(to, from) {
        this.pending = false;
      }
    },
    methods: {
      addNewPermissionGroup() {
        this.socket.emit('permissions', async (err: string | null, p: PermissionsInterface[]) => {
          if (err) {
            return console.error(err);
          }
          const id = uuid();
          const data: PermissionsInterface = {
            id,
            name: '',
            isCorePermission: false,
            isWaterfallAllowed: true,
            automation: 'none',
            order: p.length,
            userIds: [],
            filters: [],
          };

          // first we need to set last order for viewers
          await new Promise(resolve => {
            this.socket.emit('permission::update::order', { id: permission.VIEWERS, order: p.length + 1 }, () => {
              resolve();
            });
          })
          // then we add new permission before it
          this.socket.emit('permission::insert', data, () => {
            this.update = Date.now();
            this.$router.push({ name: 'PermissionsSettings', params: { id } })
          })
        })
      }
    },
  })
</script>

<style scoped>
</style>