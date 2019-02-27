<template>
  <div class="card p-0 m-0">
    <div class="card-header">Permissions Groups</div>
    <div class="card-body p-0 m-0">
      <div class="list-group list-group-flush">
        <button v-for="p of data"
                class="list-group-item list-group-item-action"
                style="font-size:1.2em; font-family: 'PT Sans Narrow', sans-serif;"
                :key="p.name">
          {{ p.name }}
          <small v-if="p.automation" class="text-dark text-uppercase" style="font-size: 0.7rem !important; letter-spacing: 1px;">
            <font-awesome-icon icon="cog"></font-awesome-icon> {{ p.automation }}
          </small>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faCog } from '@fortawesome/free-solid-svg-icons';

  library.add(faCog)

  export default Vue.extend({
    props: ['pid'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
    }
  })
</script>

<style scoped>
</style>
