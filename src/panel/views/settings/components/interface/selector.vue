<template>
  <div class="d-flex">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small class="text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <select class="form-control" :readonly="readonly" v-model="currentValue" v-on:change="onChange">
      <option v-for="(v, i) of values" :key="i">{{v}}</option>
    </select>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

@Component({})
export default class btnEmit extends Vue {
  @Prop() readonly readonly: any;
  @Prop() readonly value: any;
  @Prop() readonly title!: string;
  @Prop() readonly current: any;
  @Prop() readonly values: any;

  currentValue = this.value;
  translatedTitle = this.translate(this.title);

  @Watch('currentValue')
  onChange() {
    this.$emit('update', { value: this.currentValue });
  }
};
</script>
