<template>
  <div class="input-group"
       :class="{'focus-border': isFocused }">
    <div class="input-group-prepend">
      <div class="input-group-text bg-transparent border-right-0">
        <font-awesome-icon icon="search"></font-awesome-icon>
      </div>
    </div>
    <input
      @focus="isFocused = true"
      @blur="isFocused = false"
      v-model="inputUsername"
      type="text"
      class="form-control border-left-0"
      placeholder="Type username -or- id to search...">
    <div class="input-group-append">
      <button class="btn btn-primary" type="button" @click="addUser">Add</button>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faSearch } from '@fortawesome/free-solid-svg-icons';

  import * as io from 'socket.io-client';

  library.add(faSearch);

  export default Vue.extend({
    props: ['ids'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
    },
    data() {
      const data: {
        usersSocket: any,
        currentIds: string[],
        users: any[],
        inputUsername: string,
        isFocused: boolean,
      } = {
        usersSocket: io('/core/users', { query: "token=" + this.token }),
        currentIds: this.ids,
        users: [],
        inputUsername: '',
        isFocused: false,
      }
      return data;
    },
    watch: {
      currentIds(val) {
        console.log(val)
      }
    },
    methods: {
      addUser() {
        console.log('Adding', this.inputUsername)
      }
    }
  })
</script>

<style scoped>
</style>
