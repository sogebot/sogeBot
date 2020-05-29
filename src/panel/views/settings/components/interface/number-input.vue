<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small class="text-info pl-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <input :min="min" :max="max" v-on:keyup="update" @focus="show = true" @blur="show = false" v-model="currentValue" :step="step || 1" type="number" class="form-control" :readonly="readonly" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class numberInput extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly title!: string;
  @Prop() readonly readonly: any;
  @Prop() readonly min: any;
  @Prop() readonly max: any;
  @Prop() readonly step: any;

  show: boolean = false;
  currentValue = this.value;
  translatedTitle = this.translate(this.title);

  update() {
    let step = String(this.step || 0);

    if (step.includes('.')) {
      step = String(step.split('.')[1].length);
    }

    this.currentValue = Number(Number(this.currentValue).toFixed(Number(step)));
    if (typeof this.min !== 'undefined' && this.min > this.currentValue) {this.currentValue = this.min;}
    if (typeof this.max !== 'undefined' && this.max < this.currentValue) {this.currentValue = this.max;}

    this.$emit('update', { value: Number(this.currentValue) });
  }
}
</script>