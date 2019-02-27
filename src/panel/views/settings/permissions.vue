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
                  href: '#/settings/permissions/add',
                  text: translate('settings.permissions.addNewPermissionGroup'),
                  class: 'btn-primary',
                  icon: 'plus'
                }
              ],
            }"></panel>

    <div class="row">
      <div class="col-3">
        <list :data="permissions" @change="selectedPermission = $event"></list>
        <em class="alert-danger p-3 mt-1 d-block">
          <font-awesome-icon icon="exclamation-triangle" size="lg"></font-awesome-icon>
          Higher permission have access to lower permissions.
        </em>
      </div>
      <div class="col-auto">
        {{ selectedPermission }}
        <edit :selected="selectedPermission"></edit>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import * as io from 'socket.io-client';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

  import { permissions } from '../../../constants'

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
        socket: any,
        permissions: any,
        selectedPermission: string | null,
      } = {
        selectedPermission: null,
        socket: io('/core/permissions', { query: "token=" + this.token }),
        permissions: [
          { id: permissions.CASTERS, name: 'Casters', preserve: true, automation: 'casters' },
          { id: permissions.ADMINISTRATORS, name: 'Administrators', preserve: true, automation: null },
          { id: permissions.MODERATORS, name: 'Moderators', preserve: true, automation: 'moderators' },
          { id: permissions.SUBSCRIBERS, name: 'Subscribers', preserve: true, automation: 'subscribers' },
          { id: permissions.VIEWERS, name: 'Viewers', preserve: true, automation: 'viewers' },
        ]
      }
      return object
    },
  })
</script>

<style scoped>
</style>