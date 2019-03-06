<template>
  <div>
    <div class="card p-0 m-0">
      <div class="card-header alert-warning text-uppercase"
           style="letter-spacing: -1px;"
           v-if="!$route.params.id">
        <font-awesome-icon icon="long-arrow-alt-left"/>
        {{ translate('core.permissions.selectPermissionGroup') }}
      </div>
      <div v-else-if="_.some(isLoading)"
           class="card-header alert-info text-uppercase"
           style="letter-spacing: -1px;">
        <font-awesome-icon icon="spinner" spin/>
        {{ translate('core.permissions.loadingInProgress') }}
      </div>
      <div v-else-if="item"
           class="card-header">
        {{ translate('core.permissions.settings') }}
      </div>
      <div class="card-body p-0 m-0" v-if="!_.some(isLoading) && $route.params.id && item">
        <div class="pt-3">
          <div class="form-group col-md-12">
            <label for="name_input">{{ translate('core.permissions.name') }}</label>
            <input v-model="item.name" type="text" class="form-control" id="name_input">
            <div class="invalid-feedback"></div>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label for="extends_input">{{ translate('core.permissions.baseUsersSet') }}</label>
            <select v-model="item.automation" class="form-control">
              <option value='none'>{{ translate('core.permissions.none') }}</option>
              <option value='casters'>{{ translate('core.permissions.casters') }}</option>
              <option value='moderators'>{{ translate('core.permissions.moderators') }}</option>
              <option value='subscribers'>{{ translate('core.permissions.subscribers') }}</option>
              <option value='viewers'>{{ translate('core.permissions.viewers') }}</option>
              <option value='followers'>{{ translate('core.permissions.followers') }}</option>
            </select>
            <div class="invalid-feedback"></div>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label>{{ translate('core.permissions.manuallyAddedUsers') }}</label>
            <userslist :ids="item.userIds" @update="item.userIds = $event"></userslist>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label>{{ translate('core.permissions.filters') }}</label>
            <filters :filters="item.filters" @update="item.filters = $event"></filters>
          </div>

          <div class="form-group col-md-12">
            <label>{{ translate('core.permissions.testUser') }}</label>
            <test></test>
          </div>

          <div class="p-3 text-right">
            <hold-button class="btn-danger"
                        @trigger="removePermission()"
                        icon="trash"
                        v-if="!item.isCorePermission">
              <template slot="title">{{translate('dialog.buttons.delete')}}</template>
              <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
            </hold-button>
            <stateButton :state="isSaving" text="saveChanges" @click="save()"/>
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
    components: {
      'font-awesome-icon': FontAwesomeIcon,
      holdButton: () => import('../../../../components/holdButton.vue'),
      stateButton: () => import('../../../../components/stateButton.vue'),
      userslist: () => import('./userslist.vue'),
      filters: () => import('./filters.vue'),
      test: () => import('./test.vue'),
    },
    data() {
      const data: {
        item: Permissions.Item | null,
        extendsList: Permissions.Item[],
        socket: any,
        isSaving: number,
        isLoading: {
          [x:string]: boolean,
        },
      } = {
        item: null,
        extendsList: [],
        socket: io('/core/permissions', { query: "token=" + this.token }),
        isSaving: 0,
        isLoading: {
          permission: false,
        },
      }
      return data;
    },
    watch: {
      '$route.params.id'(val) {
        this.refresh();
      }
    },
    mounted() {
      if(this.$route.params.id) {
        this.refresh();
      }
    },
    methods: {
      refresh() {
        this.isLoading.permission = true

        this.socket.emit('permission', this.$route.params.id, (p) => {
          this.item = p;
          this.isLoading.permission = false;
        })
      },
      save() {
        this.isSaving = 1
        this.socket.emit('update', { items: [this.item]}, (err, data) => {
          if (err) {
            this.isSaving = 3
          } else {
            this.isSaving = 2
          }
          this.$emit('update');
          setTimeout(() => (this.isSaving = 0), 1000)
        })
      },
      removePermission() {
        this.socket.emit('delete', { where: { id: this.$route.params.id }}, (err, deleted) => {
          if (err) console.error(err)
          else {
            this.$emit('delete');
            this.$router.push({ name: 'PermissionsSettings' })
          }
        })
      }
    }
  })
</script>

<style scoped>
</style>
