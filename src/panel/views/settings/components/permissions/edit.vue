<template>
  <div>
    <div class="card p-0 m-0">
      <div class="card-header alert-warning text-uppercase"
           style="letter-spacing: -1px;"
           v-if="!$route.params.id">
        <fa icon="long-arrow-alt-left"/>
        {{ translate('core.permissions.selectPermissionGroup') }}
      </div>
      <div v-else-if="item"
           class="card-header">
        {{ translate('core.permissions.settings') }}
      </div>
      <div class="card-body p-0 m-0" v-if="$route.params.id && item">
        <div class="pt-3">
          <div class="form-group col-md-12">
            <label for="name_input">{{ translate('core.permissions.name') }}</label>
            <input v-model="item.name" type="text" class="form-control" id="name_input" >
            <div class="invalid-feedback"></div>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label for="extends_input">{{ translate('core.permissions.baseUsersSet') }}</label>
            <select v-model="item.automation" class="form-control" >
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
              @click="item.isWaterfallAllowed = !item.isWaterfallAllowed; "
              class="btn btn-block"
              :class="{'btn-success': item.isWaterfallAllowed, 'btn-danger': !item.isWaterfallAllowed }">
              {{ item.isWaterfallAllowed ? translate('commons.allowed') : translate('commons.disallowed') }}
            </button>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label>{{ translate('core.permissions.manuallyAddedUsers') }}</label>
            <userslist :ids="item.userIds" @update="item.userIds = $event;" :key="'userslist' + item.id"></userslist>
          </div>

          <div class="form-group col-md-12" v-if="!item.isCorePermission">
            <label>{{ translate('core.permissions.filters') }}</label>
            <filters :filters="item.filters" @update="item.filters = $event; "></filters>
          </div>

          <div class="form-group col-md-12">
            <label>{{ translate('core.permissions.testUser') }}</label>
            <test :key="'test' + item.id"></test>
          </div>

          <div class="p-3 text-right">
            <hold-button class="btn-danger"
                        @trigger="removePermission()"
                        icon="trash"
                        v-if="!item.isCorePermission">
              <template slot="title">{{translate('dialog.buttons.delete')}}</template>
              <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
            </hold-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { getSocket } from 'src/panel/helpers/socket';
  import { some } from 'lodash-es';

  import { PermissionsInterface } from 'src/bot/database/entity/permissions'

  export default Vue.extend({
    props: ['permissions'],
    components: {
      holdButton: () => import('../../../../components/holdButton.vue'),
      stateButton: () => import('../../../../components/stateButton.vue'),
      userslist: () => import('./userslist.vue'),
      filters: () => import('./filters.vue'),
      test: () => import('./test.vue'),
    },
    data() {
      const data: {
        some: any;
        item: PermissionsInterface | undefined,
        isRouteChange: boolean,
        socket: any,
      } = {
        some: some,
        item: this.permissions.find((o: PermissionsInterface) => o.id === this.$route.params.id),
        socket: getSocket('/core/permissions'),
        isRouteChange: false,
      }
      return data;
    },
    watch: {
      '$route.params.id'(val) {
        this.isRouteChange = true;
        this.item = this.permissions.find((o: PermissionsInterface) => o.id === this.$route.params.id);
        this.isRouteChange = false;
      },
    },
    methods: {
      removePermission() {
        this.$emit('update:permissions', [...this.permissions.filter((o: PermissionsInterface) => o.id !== this.$route.params.id)])
        this.$router.push({ name: 'PermissionsSettings' })
      }
    }
  })
</script>