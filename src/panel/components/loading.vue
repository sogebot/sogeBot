<template>
  <div class="text-center" >
    <b-spinner variant="primary" style="width: 5rem; height: 5rem; margin-top: 5rem;"></b-spinner>
    <div
      style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.7rem; position: relative; top: -3rem; max-width: fit-content;"
      class="text-primary text-center m-auto">{{ translate('loading') }}</div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { BSpinner } from 'bootstrap-vue'

@Component({
  components: { 'b-spinner': BSpinner }
})
export default class loading extends Vue {};
</script>