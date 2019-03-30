<template>
  <div>
    <div class="input-group border w-100"
         :class="{'focus-border': isFocused }">
      <div class="input-group-prepend">
        <div class="input-group-text bg-transparent border-0">
          <fa icon="vial" v-if="!isTesting"></fa>
          <fa icon="spinner" spin v-else></fa>
        </div>
      </div>
      <input
        @focus="isFocused = true"
        @blur="isFocused = false"
        v-model="inputUsername"
        v-on:keyup.enter="testUser(inputUsername)"
        type="text"
        class="form-control border-0"
        :placeholder="translate('core.permissions.typeUsernameOrIdToTest')"/>
    </div>

    <div class="p-3"
         :class="{ 'alert-danger': Number(status.access) === 0 && Number(partialStatus.access) === 0, 'alert-success': Number(status.access) === 1 || Number(partialStatus.access) === 1, 'alert-warning': Number(status.access) === 2 || Number(partialStatus.access) === 2 }"
         v-if="typeof status.access !== 'undefined'
               && this.inputUsername.trim().length !== 0
               && typeof partialStatus.access !== 'undefined'
               && !isTesting">
      <fa icon="question"
                        fixed-width
                        v-if="Number(status.access) === 2 || Number(partialStatus.access) === 2" />
      <fa :icon="Number(status.access) === 1 || Number(partialStatus.access) === 1 ? 'check' : 'times'"
                        fixed-width
                        v-else />
      <span v-if="Number(status.access) === 0 && Number(partialStatus.access) === 0"
            v-html="translate('core.permissions.userHaveNoAccessToThisPermissionGroup').replace('$username', this.testUsername)">
      </span>
      <span v-else-if="Number(status.access) === 1 || Number(partialStatus.access) === 1">
        <span v-html="translate('core.permissions.userHaveAccessToThisPermissionGroup').replace('$username', this.testUsername)"></span>
        <ul class="mb-0">
          <li v-if="Number(partialStatus.access) === 1">
            <span v-html="translate('core.permissions.accessDirectlyThrough')"></span>
            <a :href="'/#/settings/permissions/' + partialStatus.permission.id">{{ partialStatus.permission.name }} <small>{{ partialStatus.permission.id }}</small></a>.
          </li>
          <li v-if="Number(status.access) === 1 && status.permission.id !== partialStatus.permission.id">
            <span v-html="translate('core.permissions.accessThroughHigherPermission')"></span>
            <a :href="'/#/settings/permissions/' + status.permission.id">{{ status.permission.name }} <small>{{ status.permission.id }}</small></a>.
          </li>
        </ul>
      </span>
      <span v-else v-html="translate('core.permissions.somethingWentWrongUserWasNotFoundInBotDatabase').replace('$username', this.testUsername)"></span>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import io from 'socket.io-client';
  import uuid from 'uuid/v4';

  export default Vue.extend({
    props: ['ids'],
    data() {
      const data: {
        socket: any,
        inputUsername: string,
        testUsername: string,
        isFocused: boolean,
        isTesting: boolean,
        state: string,
        status: {},
        partialStatus: {},
      } = {
        socket: io('/core/permissions', { query: "token=" + this.token }),
        inputUsername: '',
        testUsername: '',
        isFocused: false,
        isTesting: false,
        state: '',
        status: {},
        partialStatus: {},
      }
      return data;
    },
    watch: {
      inputUsername(val) {
        // on change reset status
        this.status = {}
        this.partialStatus = {}
        this.testUsername = ''
      }
    },
    methods: {
      testUser(val) {
        this.isTesting = true
        const state = uuid()
        this.state = state
        this.status = {}
        this.partialStatus = {}
        this.testUsername = val;

        if (val.trim().length === 0) {
           this.isTesting = false;
        } else {
          this.socket.emit('test.user', { pid: this.$route.params.id, value: val, state }, (r) => {
            if (r.state === this.state) {
              // expecting this data
              this.status = r.status;
              this.partialStatus = r.partial;
              this.isTesting = false;
            }
          })
        }
      }
    }
  })
</script>

<style scoped>
</style>
