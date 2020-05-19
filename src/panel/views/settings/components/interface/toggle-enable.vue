<template>
  <div class="input-group">
    <div v-if="title" class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small class="text-info pl-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
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
  @Prop() readonly title: any;
  @Prop() readonly disabled !: boolean;

  currentValue = this.value;
  translatedTitle = this.translate(this.title);

  update() {
    this.currentValue = !this.currentValue
    this.$emit('update', { value: this.currentValue });
  }
}
</script>