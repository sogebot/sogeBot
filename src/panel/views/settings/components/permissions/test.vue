<template>
  <div>
    <div
      class="input-group border w-100"
      :class="{'focus-border': isFocused }"
    >
      <div class="input-group-prepend">
        <div class="input-group-text bg-transparent border-0">
          <fa
            v-if="!isTesting"
            icon="vial"
          />
          <fa
            v-else
            icon="spinner"
            spin
          />
        </div>
      </div>
      <input
        v-model="inputUsername"
        type="text"
        class="form-control border-0"
        :placeholder="translate('core.permissions.typeUsernameOrIdToTest')"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keyup.enter="testUser(inputUsername)"
      >
    </div>

    <div
      v-if="error.length > 0"
      class="p-3 alert-danger"
    >
      <fa
        icon="exclamation"
        fixed-width
      />
      {{ translate('core.permissions.' + error) }}
    </div>

    <div
      v-if="typeof status.access !== 'undefined'
        && this.inputUsername.trim().length !== 0
        && typeof partialStatus.access !== 'undefined'
        && !isTesting"
      class="p-3"
      :class="{ 'alert-danger': Number(status.access) === 0 && Number(partialStatus.access) === 0, 'alert-success': Number(status.access) === 1 || Number(partialStatus.access) === 1, 'alert-warning': Number(status.access) === 2 || Number(partialStatus.access) === 2 }"
    >
      <fa
        v-if="Number(status.access) === 2 || Number(partialStatus.access) === 2"
        icon="question"
        fixed-width
      />
      <fa
        v-else
        :icon="Number(status.access) === 1 || Number(partialStatus.access) === 1 ? 'check' : 'times'"
        fixed-width
      />
      <span
        v-if="Number(status.access) === 0 && Number(partialStatus.access) === 0"
        v-html="translate('core.permissions.userHaveNoAccessToThisPermissionGroup').replace('$username', this.testUsername)"
      />
      <span v-else-if="Number(status.access) === 1 || Number(partialStatus.access) === 1">
        <span v-html="translate('core.permissions.userHaveAccessToThisPermissionGroup').replace('$username', this.testUsername)" />
        <ul class="mb-0">
          <li v-if="Number(partialStatus.access) === 1">
            <span v-html="translate('core.permissions.accessDirectlyThrough')" />
            <a :href="'/#/settings/permissions/' + partialStatus.permission.id">{{ partialStatus.permission.name }} <small>{{ partialStatus.permission.id }}</small></a>.
          </li>
          <li v-if="Number(status.access) === 1 && status.permission.id !== partialStatus.permission.id">
            <span v-html="translate('core.permissions.accessThroughHigherPermission')" />
            <a :href="'/#/settings/permissions/' + status.permission.id">{{ status.permission.name }} <small>{{ status.permission.id }}</small></a>.
          </li>
        </ul>
      </span>
      <span
        v-else
        v-html="translate('core.permissions.somethingWentWrongUserWasNotFoundInBotDatabase').replace('$username', this.testUsername)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { v4 as uuid } from 'uuid';
import Vue from 'vue';

export default Vue.extend({
  props: ['ids'],
  data() {
    const data: {
      translate: typeof translate,
      socket: any,
      inputUsername: string,
      testUsername: string,
      isFocused: boolean,
      isTesting: boolean,
      state: string,
      error: string,
      status: Record<string, any>,
      partialStatus: Record<string, any>,
    } = {
      translate:     translate,
      socket:        getSocket('/core/permissions'),
      inputUsername: '',
      testUsername:  '',
      isFocused:     false,
      isTesting:     false,
      state:         '',
      error:         '',
      status:        {},
      partialStatus: {},
    };
    return data;
  },
  watch: {
    inputUsername(val: string) {
      // on change reset status
      this.status = {};
      this.partialStatus = {};
      this.testUsername = '';
    },
  },
  methods: {
    testUser(val: string) {
      this.isTesting = true;
      const state = uuid();
      this.state = state;
      this.status = {};
      this.partialStatus = {};
      this.testUsername = val;

      if (val.trim().length === 0) {
        this.isTesting = false;
      } else {
        this.socket.emit('test.user', {
          pid: this.$route.params.id, value: val, state,
        }, (err: string | null, r: { state: string; partial:  { access: boolean }; status: { access: boolean } }) => {
          if (err) {
            this.error = err;
            this.isTesting = false;
            return console.error(translate('core.permissions.' + err));
          }
          this.error = '';
          if (r.state === this.state) {
            // expecting this data
            this.status = r.status;
            this.partialStatus = r.partial;
            this.isTesting = false;
          }
        });
      }
    },
  },
});
</script>
