<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text text-left d-block">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else-if="typeof translatedTitle === 'object'">
          {{ translatedTitle.title }}
          <small style="cursor: help;" class="text-info ml-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
        <small class="d-block">{{ translate('one-record-per-line') }}</small>
      </span>
    </div>
    <textarea v-model="currentValue" class="form-control" type="text" :readonly="readonly"></textarea>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import translate from 'src/panel/helpers/translate';

@Component({})
export default class textAreaFromArray extends Vue {
  translate = translate;

  @Prop() readonly value!: any;
  @Prop() readonly title!: string;
  @Prop() readonly readonly: any;

  currentValue = this.value.join('\n');
  translatedTitle = translate(this.title);

  @Watch('currentValue')
  update() {
    this.$emit('update', this.currentValue.split('\n'));
  }
}
</script>