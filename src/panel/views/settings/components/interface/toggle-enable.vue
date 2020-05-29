<template>
  <div class="input-group">
    <div v-if="title" class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof title === 'string'">{{ title }}</template>
        <template v-else>
          {{ title.title }}
          <small class="text-info pl-1" data-toggle="tooltip" data-html="true" :title="title.help">[?]</small>
        </template>
      </span>
    </div>
    <button
      :disabled="disabled"
      class="btn form-control"
      v-bind:class="{'btn-success': currentValue, 'btn-danger': !currentValue}"
      v-on:click="update()">
      <template v-if="currentValue">{{ translate('enabled') }}</template>
      <template v-else>{{ translate('disabled') }}</template>
    </button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class toggleEnable extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly title!: string;
  @Prop() readonly disabled !: boolean;

  currentValue = this.value;

  update() {
    this.currentValue = !this.currentValue
    this.$emit('update', { value: this.currentValue });
  }
}
</script>