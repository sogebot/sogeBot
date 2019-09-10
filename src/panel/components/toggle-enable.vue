<template>
  <div class="input-group">
    <div v-if="title" class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof title === 'string'">{{ title }}</template>
        <template v-else>
          {{ title.title }}
          <small class="textInputTooltip text-info pl-1" data-toggle="tooltip" data-html="true" :title="title.help">[?]</small>
        </template>
      </span>
    </div>
    <button
      :disabled="disabled"
      class="btn form-control"
      v-bind:class="{'btn-success': this.value, 'btn-danger': !this.value}"
      v-on:click="update()">
      <template v-if="this.value">{{ translate('enabled') }}</template>
      <template v-else>{{ translate('disabled') }}</template>
    </button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class toggleEnable extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly title: any;
  @Prop() readonly disabled !: boolean;

  update() {
    this.$emit('update', !this.value);
  }
}
</script>