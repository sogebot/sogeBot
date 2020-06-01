<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else-if="typeof translatedTitle === 'object'">
          {{ translatedTitle.title }}
          <small style="cursor: help;" class="text-info ml-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <input v-on:keyup="update" @focus="show = true" @blur="show = false" v-model="currentValue" class="form-control" :type="secret && !show ? 'password' : 'text'" :readonly="readonly" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { isFinite } from 'lodash-es';

@Component({})
export default class textInput extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly title!: string;
  @Prop() readonly type: any;
  @Prop() readonly readonly: any;
  @Prop() readonly secret: any;

  show: boolean = false;
  currentValue = this.value;
  translatedTitle = this.translate(this.title);

  update() {
    if (this.type === 'number') {
      if (isFinite(Number(this.currentValue))) {
        this.currentValue = Number(this.currentValue);
      } else {
        this.currentValue = this.value;
      };
    }
    this.$emit('update', { value: this.currentValue });
  }
}
</script>

