<template>
  <div>
    <div
      class="input-group border w-100"
      :class="{'focus-border': isFocused }"
    >
      <div class="input-group-prepend">
        <div class="input-group-text bg-transparent border-0">
          <fa
            v-if="!isSearching"
            icon="search"
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
        :placeholder="translate('core.permissions.typeUsernameOrIdToSearch')"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keyup.enter="search(inputUsername)"
      >
    </div>

    <div
      v-if="searchData.length === 0 && testUsername.length != 0 && !isSearching"
      class="p-3 alert-warning"
    >
      {{ translate('core.permissions.noUsersWereFound') }}
    </div>
    <div
      v-else-if="searchData.length > 0"
      class="border"
    >
      <div>
        <button
          v-for="user of chunk(searchData, 15)[searchPage]"
          :key="user.username"
          type="button"
          class="btn col-4"
          :class="[!currentIds.includes(user.userId) ? 'btn-light' : 'btn-dark']"
          @click="toggleUser(user.username, user.userId)"
        >
          <span v-html="user.username.replace(testUsername, '<strong>' + testUsername + '</strong>')" />
          <small
            class="text-muted"
            v-html="String(user.userId).replace(testUsername, '<strong>' + testUsername + '</strong>')"
          />
        </button>
      </div>
      <div class="d-flex">
        <button
          class="btn btn-success col-4"
          type="button"
          @click="inputUsername = ''; searchData = []"
        >
          {{ translate('core.permissions.done') }}
        </button>
        <button
          class="btn btn-primary col-4"
          type="button"
          :disabled="typeof chunk(searchData, 15)[searchPage-1] === 'undefined'"
          @click="searchPage--"
        >
          {{ translate('core.permissions.previous') }}
        </button>
        <button
          class="btn btn-primary col-4"
          type="button"
          :disabled="typeof chunk(searchData, 15)[searchPage+1] === 'undefined'"
          @click="searchPage++"
        >
          {{ translate('core.permissions.next') }}
        </button>
      </div>
    </div>
    <div
      v-else-if="currentIds.length === 0"
      class="p-3 alert-warning"
    >
      {{ translate('core.permissions.noUsersManuallyAddedToPermissionYet') }}
    </div>
    <div
      v-else
      class="border"
    >
      <div>
        <button
          v-for="id of currentIds"
          :key="id"
          type="button"
          class="btn col-4 btn-dark"
          @click="currentIds = currentIds.filter((o) => o !== id)"
        >
          <span>{{ (currentUsers.find(o => o.id === id) || { username: translate('core.permissions.loading')}).username }}</span>
          <small class="text-muted">{{ id }}</small>
          <fa
            class="text-muted"
            icon="times"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { chunk, isEqual } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import Vue from 'vue';

import { getSocket } from 'src/panel/helpers/socket';
import translate from 'src/panel/helpers/translate';

export default Vue.extend({
  props: ['ids'],
  data() {
    const data: {
      translate: any,
      chunk: any,
      usersSocket: any,
      currentIds: number[],
      currentUsers: {
        username: string,
        id: number,
      }[],
      users: any[],
      testUsername: string,
      inputUsername: string,
      isFocused: boolean,
      isSearching: boolean,
      stateSearch: string,
      searchData: string[],
      searchPage: number,
    } = {
      translate:     translate,
      chunk:         chunk,
      usersSocket:   getSocket('/core/users'),
      currentIds:    this.ids,
      currentUsers:  [],
      users:         [],
      testUsername:  '',
      inputUsername: '',
      isFocused:     false,
      isSearching:   false,
      stateSearch:   '',
      searchData:    [],
      searchPage:    0,
    };
    return data;
  },
  watch: {
    inputUsername(val) {
      // on change reset status
      this.isSearching = false;
      this.searchPage = 0;
      this.searchData = [];
      this.testUsername = '';
      this.stateSearch = uuid();
    },
    currentIds: function (val) {
      if (!isEqual(val, this.ids)) {
        this.$emit('update', val);
      }
    },
  },
  mounted() {
    this.currentIds = this.currentIds.map(o => Number(o));

    for (const id of this.currentIds) {
      if (!this.currentUsers.find(o => o.id === id)) {
        this.usersSocket.emit('getNameById', id, (err: string | null, username: string) => {
          if (err) {
            return console.error(err);
          }
          this.currentUsers.push({ id, username });
        });
      }
    }
  },
  methods: {
    search(val: string) {
      this.isSearching = true;
      const state = uuid();
      this.stateSearch = state;

      if (val.trim().length === 0) {
        this.isSearching = false;
        this.searchPage = 0;
        this.searchData = [];
      } else {
        this.testUsername = val;
        this.usersSocket.emit('find.viewers', {
          search: val, state, exactUsernameFromTwitch: true, 
        }, (err: string | null, r: string[]) => {
          if (err) {
            return console.error(err);
          }
          if (state === this.stateSearch) {
            // expecting this data
            this.searchData = r;
            this.searchPage = 0;
            this.isSearching = false;
          }
        });
      }
    },
    toggleUser(username: string, id: number) {
      this.currentUsers.push({ username, id });
      if(this.currentIds.find((o) => o === id)) {
        this.currentIds = this.currentIds.filter(o => o !== id);
      } else {
        this.currentIds.push(id);
      }
    },
  },
});
</script>

<style scoped>
</style>
