<template>
  <div>
    <div class="card p-0 m-0">
      <div class="card-header alert-warning text-uppercase"
           style="letter-spacing: -1px;"
           v-if="!pid">
        <font-awesome-icon icon="long-arrow-alt-left"/>
        Select permission group
      </div>
      <div v-else-if="_.some(isLoading)"
           class="card-header alert-info text-uppercase"
           style="letter-spacing: -1px;">
        <font-awesome-icon icon="spinner" spin/>
        Loading in progress
      </div>
      <div v-else-if="item"
           class="card-header">
        <span>Settings</span>
      </div>

      <div class="card-body p-0 m-0" v-if="!_.some(isLoading) && pid">
        <div class="pt-3">
          <div class="form-group col-md-12">
            <label for="name_input">{{ translate('core.permissions.input.name.title') }}</label>
            <input v-model="item.name" type="text" class="form-control" id="name_input" :placeholder="translate('core.permissions.input.name.placeholder')">
            <div class="invalid-feedback"></div>
          </div>

          <div class="form-group col-md-12" v-if="!item.preserve">
            <label for="extends_input">{{ translate('core.permissions.input.extends.title') }}</label>
            <select v-model="item.extendsPID" class="form-control">
              <option v-for="e of extendsList" v-bind:key="e.id" :value="e.id">{{e.name}}</option>
            </select>
            <div class="invalid-feedback"></div>
          </div>

          <div class="form-group col-md-12" v-if="!item.automation">
            <label>{{ translate('core.permissions.input.users.title') }}</label>
            <userslist :ids="item.userIds" @update="item.userIds = $event"></userslist>
          </div>

          <div class="form-group col-md-12" v-if="!item.automation && !item.preserve">
            <label>{{ translate('core.permissions.input.filters.title') }}</label>
            <filters :filters="item.filters" @update="item.filters = $event"></filters>
          </div>

          <div class="p-3 text-right">
            <hold-button class="btn-danger"
                        @trigger="removePermission(pid)"
                        icon="trash"
                        v-if="!item.preserve">
              <template slot="title">{{translate('dialog.buttons.delete')}}</template>
              <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
            </hold-button>
            <buttonWithIcon icon="save"
                            class="btn-primary"
                            :text="translate('dialog.buttons.saveChanges.idle')">
            </buttonWithIcon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faLongArrowAltLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';

  import * as io from 'socket.io-client';

  library.add(faLongArrowAltLeft, faSpinner);

  export default Vue.extend({
    props: ['pid'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
      holdButton: () => import('../../../../components/holdButton.vue'),
      buttonWithIcon: () => import('../../../../components/button.vue'),
      userslist: () => import('./userslist.vue'),
      filters: () => import('./filters.vue'),
    },
    data() {
      const data: {
        item: Permissions.Item | null,
        extendsList: Permissions.Item[],
        socket: any,
        isLoading: {
          [x:string]: boolean,
        },
      } = {
        item: null,
        extendsList: [],
        socket: io('/core/permissions', { query: "token=" + this.token }),
        isLoading: {
          permission: false,
          extendsList: false,
        },
      }
      return data;
    },
    watch: {
      pid(val) {
        this.isLoading.permission = true
        this.isLoading.extendsList = true

        this.socket.emit('permission', val, (p) => {
          this.item = p;
          this.isLoading.permission = false;
        })
        this.socket.emit('permissions.extendsList', (p) => {
          this.extendsList = p;
          this.isLoading.extendsList = false;
        })
      }
    },
    methods: {
      removePermission(pid) {
        console.log(pid);
      }
    }
  })
</script>

<style scoped>
</style>
