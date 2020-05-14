<template>
  <div class="text-center" style="margin:auto;">
    <b-spinner variant="primary"
    style="width: 5rem; height: 5rem;"
      :style="{
        'margin-top': noMargin ? '0' : '5rem'
      }"></b-spinner>
    <div
      style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.7rem; position: relative; top: -3rem; max-width: fit-content;"
      class="text-primary text-center m-auto">{{ translate('loading') }}</div>
    <div
      v-if="slow"
      style="text-transform: uppercase; letter-spacing: 1px; font-size: 0.7rem; position: relative; top: -1rem; max-width: fit-content;"
      class="text-primary text-center m-auto" v-html="translate('this-may-take-a-while')"></div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { BSpinner } from 'bootstrap-vue'

@Component({
  components: { 'b-spinner': BSpinner }
})
export default class loading extends Vue {
  @Prop(Boolean) readonly slow: boolean | undefined;
  @Prop(Boolean) readonly noMargin: boolean | undefined;
};
</script>