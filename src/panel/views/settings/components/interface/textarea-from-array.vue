<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text text-left">
        <span class="d-block">
          {{ title }}
          <small class="d-block">{{ translate('one-record-per-line') }}</small>
        </span>
      </span>
    </div>
    <textarea v-on:keyup="update" v-model="currentValue" class="form-control" type="text" :readonly="readonly"></textarea>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class textAreaFromArray extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly title!: string;
  @Prop() readonly readonly: any;

  currentValue = this.value.join('\n');

  update() {
    this.$emit('update', this.currentValue.split('\n'));
  }
}
</script>