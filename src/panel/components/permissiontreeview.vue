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
    props: ['data'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
    }
  })
</script>

<style scoped>
@media only screen and (max-width: 1000px) {
  .btn-shrink {
    padding: 0!important;
  }
  .btn-shrink .text {
    display: none !important;
  }
  .btn-shrink .btn-icon {
    background: transparent !important;
  }
}

.btn-only-icon .text {
  display: none !important;
}
.btn-only-icon .btn-icon {
  background: transparent !important;
}

.btn-with-icon {
  padding: 0;
  display: inline-block;
  width: fit-content;
}

.btn-reverse > div {
  flex-direction: row-reverse !important;
}

.btn-with-icon .text + .btn-icon {
  background: rgba(0,0,0,0.15);
}

.btn-with-icon .btn-icon {
  display: inline-block;
  padding: 0.375rem 0.4rem;
  flex-shrink: 10;
}

.btn-with-icon .text {
  padding: 0.375rem 0.4rem;
}
</style>
