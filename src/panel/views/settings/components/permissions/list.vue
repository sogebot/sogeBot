<template>
  <div class="card p-0 m-0">
    <div class="card-header">Permissions Groups</div>
    <div class="card-body p-0 m-0">
      <div class="list-group list-group-flush">
        <button v-for="p of data"
                class="list-group-item list-group-item-action"
                :class="{ active: currentPID === p.id }"
                style="font-size:1.2em; font-family: 'PT Sans Narrow', sans-serif;"
                :key="p.name"
                @click="setPermission(p.id)">
          {{ p.name }}
          <small v-if="p.automation"
                 class="text-uppercase"
                 :class="{ 'text-dark': currentPID !== p.id, 'text-light': currentPID === p.id }"
                 style="font-size: 0.7rem !important; letter-spacing: 1px;">
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
    props: ['data'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
    },
    data() {
      return {
        currentPID: null,
      }
    },
    methods: {
      setPermission(pid) {
        this.currentPID = pid
        this.$emit('change', pid);
      }
    }
  })
</script>

<style scoped>
</style>
