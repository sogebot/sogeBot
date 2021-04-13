<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">{{ command }}</span>
    </div>
    <input
      v-model="currentValue"
      class="form-control"
      type="text"
    >
    <div
      v-if="!permissionsLoaded"
      class="input-group-append"
    >
      <div
        class="spinner-grow spinner-grow-sm"
        role="status"
      >
        <span class="sr-only">Loading...</span>
      </div>
    </div>
    <div
      v-else
      class="input-group-append"
    >
      <b-dropdown :variant="getVariant(currentPermissions)">
        <template #button-content>
          <template v-if="permissionsLoaded">
            <span v-if="getPermissionName(currentPermissions) !== null">{{ getPermissionName(currentPermissions) }}</span>
            <span v-else>
              <fa icon="exclamation-triangle" /> Permission not found
            </span>
          </template>
          <div
            v-else
            class="spinner-grow spinner-grow-sm"
            role="status"
          >
            <span class="sr-only">Loading...</span>
          </div>
        </template>

        <template v-if="permissionsLoaded">
          <b-dropdown-item
            v-for="p of permissionsList"
            :key="p.id"
            @click="currentPermissions = p.id"
          >
            {{ getPermissionName(p.id) }}
          </b-dropdown-item>
          <b-dropdown-item
            @click="currentPermissions = null"
          >
            Disabled
          </b-dropdown-item>
        </template>
      </b-dropdown>
    </div>
  </div>
</template>

<script lang="ts">

import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import { isFinite } from 'lodash-es';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';

import type { PermissionsInterface } from 'src/bot/database/entity/permissions';

library.add(faExclamationTriangle);

@Component({})
export default class sortableList extends Vue {
  @Prop() readonly value!: any;
  @Prop() readonly command: any;
  @Prop() readonly type: any;
  @Prop() readonly permissions!: any;

  socket = getSocket('/core/permissions');
  currentValue = this.value;
  currentPermissions = this.permissions;
  permissionsList: PermissionsInterface[] = [];
  permissionsLoaded = false;

  @Watch('currentPermissions')
  @Watch('currentValue')
  update() {
    if (this.type === 'number') {
      if (isFinite(Number(this.currentValue))) {
        this.currentValue = Number(this.currentValue);
      } else {
        this.currentValue = this.value;
      }
    }
    this.$emit('update', { value: this.currentValue, permissions: this.currentPermissions });
  }

  mounted() {
    this.socket.emit('permissions', (err: string | null, data: PermissionsInterface[]) => {
      if (err) {
        return console.error(err);
      }
      this.permissionsList = data;
      this.permissionsLoaded = true;
    });
  }

  getVariant(currentPermissions: string | null) {
    if (currentPermissions === null) {
      return 'light';
    }
    if (this.getPermissionName(currentPermissions) !== null) {
      return 'dark';
    }
    if (this.getPermissionName(currentPermissions) === null) {
      return 'danger';
    }
  }

  getPermissionName(id: string | null) {
    if (!id) {
      return 'Disabled';
    }
    const permission = this.permissionsList.find((o) => {
      return o.id === id;
    });
    if (typeof permission !== 'undefined') {
      if (permission.name.trim() === '') {
        return permission.id;
      } else {
        return permission.name;
      }
    } else {
      return null;
    }
  }
}
</script>
