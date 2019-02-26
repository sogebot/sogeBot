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
      <div class="col-auto">
        <treeview :data="permissions"></treeview>
        <em>Higher permission have access to lower permissions.</em>
      </div>
      <div class="col-auto">
        Permission edit
      </div>
    </div>

  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import * as io from 'socket.io-client';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import {  } from '@fortawesome/free-solid-svg-icons';

  library.add()

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      treeview: () => import('../../components/treeview.vue'),
      'font-awesome-icon': FontAwesomeIcon
    },
    data: function () {
      const object: {
        socket: any,
        permissions: any,
      } = {
        socket: io('/systems/polls', { query: "token=" + this.token }),
        permissions: {
          owners: [
            { 'name': '_all', preserve: true }
          ],
          mods: [
            { 'name': '_all', preserve: true }
          ],
          subscribers: [
            { 'name': '_all', preserve: true }
          ],
          viewers: [
            { 'name': '_all', preserve: true }
          ]
        }
      }
      return object
    },
  })
</script>

<style scoped>
</style>