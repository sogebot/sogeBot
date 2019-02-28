<template>
  <div>
    <div class="p-3 alert-warning" v-if="cFilters.length === 0">
      No filters added to permission yet.
    </div>
    <div class="border" v-else-if="cFilters.length > 0">
      {{ cFilters }}
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import {  } from '@fortawesome/free-solid-svg-icons';

  import * as io from 'socket.io-client';

  library.add();

  export default Vue.extend({
    props: ['filters'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
    },
    data() {
      const data: {
        cFilters: Permissions.Filter[],
      } = {
        cFilters: this.filters,
      }
      return data;
    },
  })
</script>

<style scoped>
</style>
