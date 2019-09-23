<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">{{ command }}</span>
    </div>
    <input v-on:keyup="update" v-model="currentValue" class="form-control" type="text" />
    <div v-if="!permissionsLoaded" class="input-group-append">
      <div class="spinner-grow spinner-grow-sm" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    </div>
    <div class="input-group-append" v-else>
      <div class="dropdown">
        <button class="btn dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown"
                :class="{'btn-light': currentPermissions === null, 'btn-dark': currentPermissions !== null && getPermissionName(currentPermissions) !== null, 'btn-danger': currentPermissions !== null && getPermissionName(currentPermissions) === null}">
          <template v-if="permissionsLoaded">
            <span v-if="getPermissionName(currentPermissions) !== null">{{ getPermissionName(currentPermissions) }}</span>
            <span v-else>
              <fa icon="exclamation-triangle"/> Permission not found
            </span>
          </template>
          <div v-else class="spinner-grow spinner-grow-sm" role="status">
            <span class="sr-only">Loading...</span>
          </div>
        </button>
        <div class="dropdown-menu" aria-labelledby="dropdownMenuButton" style="z-index: 9999;">
          <template v-if="permissionsLoaded">
            <button
              v-for="p of permissionsList"
              class="dropdown-item"
              @click="currentPermissions = p.id"
              :key="p.id"
            >{{getPermissionName(p.id)}}</button>
            <button
              class="dropdown-item"
              @click="currentPermissions = null"
            >Disabled</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import { isFinite, orderBy } from 'lodash';

@Component({})
export default class sortableList extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly command: any;
  @Prop() readonly type: any;
  @Prop() readonly permissions: any;
  @Prop() readonly token: any;

  socket: SocketIOClient.Socket = io('/core/permissions', { query: 'token=' + this.token });
  currentValue = this.value;
  currentPermissions = this.permissions;
  permissionsList: any[] = [];
  permissionsLoaded: boolean = false;

  @Watch('currentPermissions')
  update() {
    if (this.type === 'number') {
      if (isFinite(Number(this.currentValue))) {
        this.currentValue = Number(this.currentValue);
      } else {
        this.currentValue = this.value;
      };
    }
    this.$emit('update', { value: this.currentValue, permissions: this.currentPermissions });
  }

  mounted() {
    this.socket.emit('find', {}, (err, data) => {
      if (err) {return console.error(err);};
      this.permissionsList = orderBy(data, 'order', 'asc');
      this.permissionsLoaded = true;
    });
  }

  getPermissionName(id) {
    if (!id) {return 'Disabled';};
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
};
</script>
