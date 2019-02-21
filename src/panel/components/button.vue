<template>
  <a
    v-if="href"
    :href="href"
    class="btn btn-with-icon"
    :target="target">
    <div style="display: flex">
      <div class="text">
        {{ text }}
      </div>
      <div class="btn-icon" v-if="icon">
        <font-awesome-icon :icon="icon" fixed-width></font-awesome-icon>
      </div>
    </div>
  </a>
  <button v-else type="button" class="btn btn-with-icon" style="flex-direction: row;"
    @click="$emit(event)">
    <div style="display: flex">
      <div class="text">
        {{ text }}
      </div>
      <div class="btn-icon" v-if="icon">
        <font-awesome-icon :icon="icon" fixed-width></font-awesome-icon>
      </div>
    </div>
  </button>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faLink, faEdit } from '@fortawesome/free-solid-svg-icons';

  library.add(faLink, faEdit)

  export default Vue.extend({
    props: ['text', 'href', 'icon', 'target'],
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
