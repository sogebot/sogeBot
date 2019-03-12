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

    <panel ref="panel" class="pt-3 pb-3 mt-3 mb-3 m-0 border-top border-bottom row"
           :options="{
              hideCardsButton: true,
              hideTableButton: true,
              hideSearchInput: true,
              leftButtons: [
                {
                  text: translate('core.permissions.addNewPermissionGroup'),
                  class: 'btn-primary',
                  icon: 'plus',
                  event: 'addNewPermissionGroup'
                }
              ],
            }"
            @addNewPermissionGroup="addNewPermissionGroup()"></panel>

    <div class="row">
      <div class="col-3">
        <list :update="update"></list>
        <em class="alert-danger p-3 mt-1 d-block">
          <font-awesome-icon icon="exclamation-triangle" size="lg"></font-awesome-icon>
          {{translate('core.permissions.higherPermissionHaveAccessToLowerPermissions')}}
        </em>
      </div>
      <div class="col-9">
        <edit @delete="update = Date.now()" @update="update = Date.now()"></edit>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import * as io from 'socket.io-client';
  import * as uuid from 'uuid/v4';

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
      } = {
        update: Date.now(),
        socket: io('/core/permissions', { query: "token=" + this.token }),
      }
      return object
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