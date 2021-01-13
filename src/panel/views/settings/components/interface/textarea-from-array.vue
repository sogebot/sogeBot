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
import { defineComponent, ref, watch } from '@vue/composition-api'
import translate from 'src/panel/helpers/translate';

export default defineComponent({
  props: {
    value: Array,
    title: String,
    readonly: Boolean,
  },
  setup(props: { value: string[]; title: string; readonly: boolean }, ctx) {
    const currentValue = ref(props.value.join('\n'));
    const translatedTitle = ref(translate(props.title))

    watch(currentValue, (val) => {
      ctx.emit('update', { value: val.split('\n') })
    })

    return {
      currentValue,
      translatedTitle,
      translate,
    }
  }
})
</script>