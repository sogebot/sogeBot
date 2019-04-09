<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.settings') }}
          <small><i class="fas fa-angle-right"></i></small>
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

  import io from 'socket.io-client';
  import uuid from 'uuid/v4';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

  library.add(faExclamationTriangle)

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      list: () => import('./components/permissions/list.vue'),
      edit: () => import('./components/permissions/edit.vue'),
      'font-awesome-icon': FontAwesomeIcon
    },
    data: function () {
      const object: {
        update: number,
        socket: any,
        pending: boolean,
      } = {
        update: Date.now(),
        socket: io('/core/permissions', { query: "token=" + this.token }),
        pending: false,
      }
      return object
    },
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
    },
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
    },
    watch: {
      $route(to, from) {
        this.pending = false;
      }
    },
    methods: {
      addNewPermissionGroup() {
        this.socket.emit('find', {}, (err, p) => {
          const order = p.length + 1
          const id = uuid()
          this.socket.emit('insert', {items: [{
            id,
            name: '',
            isCorePermission: false,
            isWaterfallAllowed: true,
            automation: 'none',
            order,
            userIds: [],
            filters: [],
          }]}, (err, created) => {
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