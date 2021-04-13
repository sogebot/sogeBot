<template>
  <div>
    <div class="card p-0 m-0">
      <div
        v-if="!$route.params.id"
        class="card-header alert-warning text-uppercase"
        style="letter-spacing: -1px;"
      >
        <fa icon="long-arrow-alt-left" />
        {{ translate('core.permissions.selectPermissionGroup') }}
      </div>
      <div
        v-else-if="item"
        class="card-header"
      >
        {{ translate('core.permissions.settings') }}
      </div>
      <div
        v-if="$route.params.id && item"
        class="card-body p-0 m-0"
      >
        <div class="pt-3">
          <div class="form-group col-md-12">
            <label for="name_input">{{ translate('core.permissions.name') }}</label>
            <input
              id="name_input"
              v-model="item.name"
              type="text"
              class="form-control"
            >
            <div class="invalid-feedback" />
          </div>

          <div
            v-if="!item.isCorePermission"
            class="form-group col-md-12"
          >
            <label for="extends_input">{{ translate('core.permissions.baseUsersSet') }}</label>
            <select
              v-model="item.automation"
              class="form-control"
            >
              <option value="none">
                {{ translate('core.permissions.none') }}
              </option>
              <option value="casters">
                {{ translate('core.permissions.casters') }}
              </option>
              <option value="moderators">
                {{ translate('core.permissions.moderators') }}
              </option>
              <option value="subscribers">
                {{ translate('core.permissions.subscribers') }}
              </option>
              <option value="vip">
                {{ translate('core.permissions.vip') }}
              </option>
              <option value="viewers">
                {{ translate('core.permissions.viewers') }}
              </option>
              <option value="followers">
                {{ translate('core.permissions.followers') }}
              </option>
            </select>
            <div class="invalid-feedback" />
          </div>

          <div
            v-if="!item.isCorePermission"
            class="form-group col-md-12"
          >
            <label>{{ translate('core.permissions.allowHigherPermissions') }}</label>
            <button
              type="button"
              class="btn btn-block"
              :class="{'btn-success': item.isWaterfallAllowed, 'btn-danger': !item.isWaterfallAllowed }"
              @click="item.isWaterfallAllowed = !item.isWaterfallAllowed; "
            >
              {{ item.isWaterfallAllowed ? translate('commons.allowed') : translate('commons.disallowed') }}
            </button>
          </div>

          <div
            v-if="!item.isCorePermission"
            class="form-group col-md-12"
          >
            <label>{{ translate('core.permissions.manuallyAddedUsers') }}</label>
            <userslist
              :key="'userslist' + item.id"
              :ids="item.userIds"
              @update="item.userIds = $event;"
            />
          </div>

          <div
            v-if="!item.isCorePermission"
            class="form-group col-md-12"
          >
            <label>{{ translate('core.permissions.manuallyExcludedUsers') }}</label>
            <userslist
              :key="'exclude-userslist' + item.id"
              :ids="item.excludeUserIds"
              @update="item.excludeUserIds = $event;"
            />
          </div>

          <div
            v-if="!item.isCorePermission"
            class="form-group col-md-12"
          >
            <label>{{ translate('core.permissions.filters') }}</label>
            <filters
              :filters="item.filters"
              @update="item.filters = $event; "
            />
          </div>

          <div class="form-group col-md-12">
            <label>{{ translate('core.permissions.testUser') }}</label>
            <test :key="'test' + item.id" />
          </div>

          <div class="p-3 text-right">
            <hold-button
              v-if="!item.isCorePermission"
              class="btn-danger"
              icon="trash"
              @trigger="removePermission()"
            >
              <template slot="title">
                {{ translate('dialog.buttons.delete') }}
              </template>
              <template slot="onHoldTitle">
                {{ translate('dialog.buttons.hold-to-delete') }}
              </template>
            </hold-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { some } from 'lodash-es';
import Vue from 'vue';

import { PermissionsInterface } from 'src/bot/database/entity/permissions';

export default Vue.extend({
  components: {
    holdButton: () => import('../../../../components/holdButton.vue'),
    userslist:  () => import('./userslist.vue'),
    filters:    () => import('./filters.vue'),
    test:       () => import('./test.vue'),
  },
  props: ['permissions'],
  data() {
    const data: {
      translate: typeof translate;
      some: any;
      item: PermissionsInterface | undefined,
      isRouteChange: boolean,
      socket: any,
    } = {
      translate:     translate,
      some:          some,
      item:          this.permissions.find((o: PermissionsInterface) => o.id === this.$route.params.id),
      socket:        getSocket('/core/permissions'),
      isRouteChange: false,
    };
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
      this.$emit('update:permissions', [...this.permissions.filter((o: PermissionsInterface) => o.id !== this.$route.params.id)]);
      this.$router.push({ name: 'PermissionsSettings' });
    },
  },
});
</script>