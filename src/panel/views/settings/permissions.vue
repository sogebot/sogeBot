<template>
  <div
    ref="window"
    class="container-fluid"
  >
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.settings') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.permissions') }}
        </span>
      </div>
    </div>

    <panel>
      <template #left>
        <button-with-icon
          class="btn-primary btn-reverse"
          icon="plus"
          @click="addNewPermissionGroup"
        >
          {{ translate('core.permissions.addNewPermissionGroup') }}
        </button-with-icon>
      </template>

      <template #right>
        <b-alert
          v-if="pending"
          show
          variant="info"
          class="mr-2 p-2 mb-0"
          v-html="translate('dialog.changesPending')"
        />
        <state-button
          text="saveChanges"
          :state="state.save"
          @click="save()"
        />
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success" />
    <div
      v-else
      class="row"
    >
      <div class="col-3">
        <list :permissions.sync="permissions" />
        <em class="alert-danger p-3 mt-1 d-block">
          <font-awesome-icon
            icon="exclamation-triangle"
            size="lg"
          />
          {{ translate('core.permissions.higherPermissionHaveAccessToLowerPermissions') }}
        </em>
      </div>
      <div class="col-9">
        <edit :permissions.sync="permissions" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { NextFunction } from 'express';
import { sortBy } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import Vue from 'vue';
import { Route } from 'vue-router';

import { PermissionsInterface } from 'src/bot/database/entity/permissions';
import { defaultPermissions } from 'src/bot/helpers/permissions/defaultPermissions';

library.add(faExclamationTriangle);

export default Vue.extend({
  components: {
    panel:   () => import('../../components/panel.vue'),
    loading: () => import('../../components/loading.vue'),
    list:    () => import('./components/permissions/list.vue'),
    edit:    () => import('./components/permissions/edit.vue'),
  },
  beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
    if (to.name === 'PermissionsSettings') {
      this.reorder(); // reorder on router change or on delete
      next();
    } else {
      if (this.pending) {
        const isOK = confirm('You will lose your pending changes. Do you want to continue?');
        if (!isOK) {
          next(false);
        } else {
          next();
        }
      } else {
        next();
      }
    }
  },
  beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
    if (to.name === 'PermissionsSettings') {
      this.reorder(); // reorder on router change or on delete
      next();
    } else {
      if (this.pending) {
        const isOK = confirm('You will lose your pending changes. Do you want to continue?');
        if (!isOK) {
          next(false);
        } else {
          next();
        }
      } else {
        next();
      }
    }
  },
  data: function () {
    const object: {
      translate: typeof translate;
      socket: any,
      pending: boolean,
      state: {
        loading: number,
        reorder: number,
        save: number,
      },
      permissions: PermissionsInterface[],
    } = {
      translate: translate,
      socket:    getSocket('/core/permissions'),
      pending:   false,
      state:     {
        loading: this.$state.progress,
        reorder: this.$state.idle,
        save:    this.$state.idle,
      },
      permissions: [],
    };
    return object;
  },
  watch: {
    permissions: {
      deep: true,
      handler(val) {
        if (this.state.loading === this.$state.success) {
          this.pending = true;
        }
      },
    },
  },
  mounted() {
    this.socket.emit('permissions', (err: string | null, data: PermissionsInterface[]) => {
      if (err) {
        return console.error(err);
      }
      this.permissions = data;
      this.$nextTick(() => {
        this.state.loading = this.$state.success;
      });
    });
  },
  methods: {
    async save() {
      this.state.save = this.$state.progress;
      await new Promise<void>(resolve => {
        this.socket.emit('permission::save', this.permissions, () => {
          resolve();
        });
      });
      this.pending = false;
      this.state.save = this.$state.success;
      window.setTimeout(() => this.state.save = this.$state.idle, 1000);
    },
    reorder() {
      // update orders
      const permissionsToReorder = sortBy(this.permissions.filter(o => o.id !== defaultPermissions.VIEWERS, 'order'));
      console.log(permissionsToReorder);
      for (let i = 0; i < permissionsToReorder.length; i++) {
        permissionsToReorder[i].order = i;
      }
      const viewers = this.permissions.find(o => o.id === defaultPermissions.VIEWERS);
      if (viewers) {
        viewers.order = this.permissions.length - 1;
      }
    },
    async addNewPermissionGroup() {
      const id = uuid();
      const data: PermissionsInterface = {
        id,
        name:               '',
        isCorePermission:   false,
        isWaterfallAllowed: true,
        automation:         'none',
        order:              this.permissions.length - 1,
        userIds:            [],
        excludeUserIds:     [],
        filters:            [],
      };
      this.permissions.push(data);
      this.reorder();
      this.$router.push({ name: 'PermissionsSettings', params: { id } }).catch(() => {
        return;
      });
    },
  },
});
</script>

<style scoped>
</style>