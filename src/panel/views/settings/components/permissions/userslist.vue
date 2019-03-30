<template>
  <div>
    <div class="input-group border w-100"
         :class="{'focus-border': isFocused }">
      <div class="input-group-prepend">
        <div class="input-group-text bg-transparent border-0">
          <fa icon="search" v-if="!isSearching"></fa>
          <fa icon="spinner" spin v-else></fa>
        </div>
      </div>
      <input
        @focus="isFocused = true"
        @blur="isFocused = false"
        v-model="inputUsername"
        v-on:keyup.enter="search(inputUsername)"
        type="text"
        class="form-control border-0"
        :placeholder="translate('core.permissions.typeUsernameOrIdToSearch')"/>
    </div>

    <div class="p-3 alert-warning" v-if="searchData.length === 0 && testUsername.length != 0 && !isSearching">
      {{translate('core.permissions.noUsersWereFound')}}
    </div>
    <div class="border" v-else-if="searchData.length > 0">
      <div>
        <button type="button"
                class="btn col-4"
                v-for="user of _.chunk(searchData, 15)[searchPage]"
                :class="[!currentIds.includes(user.id) ? 'btn-light' : 'btn-dark']"
                :key="user.username"
                @click="toggleUser(user.username, user.id)">
          <span v-html="user.username.replace(testUsername, '<strong>' + testUsername + '</strong>')"></span>
          <small class="text-muted" v-html="user.id.replace(testUsername, '<strong>' + testUsername + '</strong>')"></small>
        </button>
      </div>
      <div class="d-flex">
        <button class="btn btn-success col-4" type="button" @click="inputUsername = ''; searchData = []">{{translate('core.permissions.done')}}</button>
        <button class="btn btn-primary col-4" type="button" :disabled="typeof _.chunk(searchData, 15)[searchPage-1] === 'undefined'" @click="searchPage--">{{translate('core.permissions.previous')}}</button>
        <button class="btn btn-primary col-4" type="button" :disabled="typeof _.chunk(searchData, 15)[searchPage+1] === 'undefined'" @click="searchPage++">{{translate('core.permissions.next')}}</button>
      </div>
    </div>
    <div class='p-3 alert-warning' v-else-if="currentIds.length === 0">
      {{translate('core.permissions.noUsersManuallyAddedToPermissionYet')}}
    </div>
    <div class="border" v-else>
      <div>
        <button type="button"
                class="btn col-4 btn-dark"
                v-for="id of currentIds"
                :key="id"
                @click="currentIds = currentIds.filter((o) => o !== id)">
          <span>{{(currentUsers.find(o => o.id === id) || { username: translate('core.permissions.loading')}).username}}</span>
          <small class="text-muted">{{id}}</small>
          <fa class="text-muted" icon="times"></fa>
        </button>
      </div>
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
        usersSocket: any,
        currentIds: string[],
        currentUsers: {
          username: string,
          id: string,
        }[],
        users: any[],
        testUsername: string,
        inputUsername: string,
        isFocused: boolean,
        isSearching: boolean,
        stateSearch: string,
        searchData: {}[],
        searchPage: number,
      } = {
        usersSocket: io('/core/users', { query: "token=" + this.token }),
        currentIds: this.ids,
        currentUsers: [],
        users: [],
        testUsername: '',
        inputUsername: '',
        isFocused: false,
        isSearching: false,
        stateSearch: '',
        searchData: [],
        searchPage: 0,
      }
      return data;
    },
    mounted() {
      for (const id of this.currentIds) {
        if (!this.currentUsers.find(o => o.id === id)) {
          this.usersSocket.emit('findOne', { collection: '_users', where: { id } }, (e, r) => {
            if (e) return console.error(e);
            this.currentUsers.push({
              id: r.id, username: r.username
            });
          });
        }
      }
    },
    watch: {
      inputUsername(val) {
        // on change reset status
        this.isSearching = false;
        this.searchPage = 0;
        this.searchData = [];
        this.testUsername = ''
        this.stateSearch = uuid();
      },
      currentIds: function (val) {
        this.$emit('update', val)
      }
    },
    methods: {
      search(val) {
        this.isSearching = true
        const state = uuid()
        this.stateSearch = state

        if (val.trim().length === 0) {
           this.isSearching = false;
           this.searchPage = 0;
           this.searchData = [];
        } else {
          this.testUsername = val;
          this.usersSocket.emit('search', { search: val, state }, (r) => {
            if (r.state === this.stateSearch) {
              // expecting this data
              this.searchData = r.results;
              this.searchPage = 0;
              this.isSearching = false;
            }
          })
        }
      },
      toggleUser(username, id) {
        this.currentUsers.push({
          username, id
        })
        if(this.currentIds.find((o) => o === id)) {
          this.currentIds = this.currentIds.filter(o => o !== id)
        } else {
          this.currentIds.push(id);
        }
      }
    }
  })
</script>

<style scoped>
</style>
