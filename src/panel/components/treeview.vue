<template>
  <div>
    <template v-for="[p, items] of Object.entries(data)">
      <div :key="p"
           style="font-size:1.3em; font-weight: bold; font-family: 'PT Sans Narrow', sans-serif"
           class="text-uppercase">{{ p }}</div>
      <button class="btn btn-outline-primary border-0 text-left"
              style="font-size:1.2em; font-family: 'PT Sans Narrow', sans-serif;"
              v-for="d of items"
              :key="d.name">{{ d.name }}</button>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faLink, faEdit } from '@fortawesome/free-solid-svg-icons';

  library.add(faLink, faEdit)

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
