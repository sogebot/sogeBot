<template>
  <div>
    <div class="card p-0 m-0">
      <div class="card-header alert-warning text-uppercase"
           style="letter-spacing: -1px;"
           v-if="!$route.params.id">
        <fa icon="long-arrow-alt-left"/>
        {{ translate('core.permissions.selectPermissionGroup') }}
      </div>
      <div v-else-if="_.some(isLoading)"
           class="card-header alert-info text-uppercase"
           style="letter-spacing: -1px;">
        <fa icon="spinner" spin/>
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
            <input v-model="item.name" type="text" class="form-control" id="name_input" @change="isPending = true">
            <div class="invalid-feedback"></div>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label for="extends_input">{{ translate('core.permissions.baseUsersSet') }}</label>
            <select v-model="item.automation" class="form-control" @change="isPending = true">
              <option value='none'>{{ translate('core.permissions.none') }}</option>
              <option value='casters'>{{ translate('core.permissions.casters') }}</option>
              <option value='moderators'>{{ translate('core.permissions.moderators') }}</option>
              <option value='subscribers'>{{ translate('core.permissions.subscribers') }}</option>
              <option value='vip'>{{ translate('core.permissions.vip') }}</option>
              <option value='viewers'>{{ translate('core.permissions.viewers') }}</option>
              <option value='followers'>{{ translate('core.permissions.followers') }}</option>
            </select>
            <div class="invalid-feedback"></div>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label>{{ translate('core.permissions.allowHigherPermissions') }}</label>
            <button
              type="button"
              @click="item.isWaterfallAllowed = !item.isWaterfallAllowed; isPending = true"
              class="btn btn-block"
              :class="{'btn-success': item.isWaterfallAllowed, 'btn-danger': !item.isWaterfallAllowed }">
              {{ item.isWaterfallAllowed ? translate('commons.allowed') : translate('commons.disallowed') }}
            </button>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label>{{ translate('core.permissions.manuallyAddedUsers') }}</label>
            <userslist :ids="item.userIds" @update="item.userIds = $event; isPending = true"></userslist>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label>{{ translate('core.permissions.filters') }}</label>
            <filters :filters="item.filters" @update="item.filters = $event; isPending = true"></filters>
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
            <div class="btn alert-warning" v-if="isPending">
              <fa icon="exclamation-circle" class="mr-1"/>{{translate('dialog.changesPending')}}</div>
            <stateButton :state="isSaving" text="saveChanges" @click="save()"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import io from 'socket.io-client';

  export default Vue.extend({
    props: ['update'],
    components: {
      holdButton: () => import('../../../../components/holdButton.vue'),
      stateButton: () => import('../../../../components/stateButton.vue'),
      userslist: () => import('./userslist.vue'),
      filters: () => import('./filters.vue'),
      test: () => import('./test.vue'),
    },
    data() {
      const data: {
        item: Permissions.Item | null,
        socket: any,
        isPending: boolean,
        isSaving: number,
        isLoading: {
          [x:string]: boolean,
        },
      } = {
        item: null,
        socket: io('/core/permissions', { query: "token=" + this.token }),
        isSaving: 0,
        isPending: false,
        isLoading: {
          permission: false,
        },
      }
      return data;
    },
    watch: {
      '$route.params.id'(val) {
        this.refresh();
      },
      update() {
        this.refreshOrder()
      },
      isPending(val) {
        this.$emit('pending', val);
      }
    },
    mounted() {
      if(this.$route.params.id) {
        this.isPending = false;
        this.refresh();
      }
    },
    methods: {
      refreshOrder() {
        this.socket.emit('permission', this.$route.params.id, (p) => {
          if (this.item) {
            this.$set(this.item, 'order', p.order);
          }
        })
      },
      refresh() {
        this.isLoading.permission = true
        this.isPending = false;

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
          this.isPending = false;
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