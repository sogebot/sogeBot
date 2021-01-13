<template>
  <div class="input-group">
    <div v-if="title" class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof title === 'string'">{{ translatedTitle }}</template>
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
import { defineComponent, ref, computed } from '@vue/composition-api'
import translate from 'src/panel/helpers/translate';

export default defineComponent({
  props: {
    value: Boolean,
    title: String,
    disabled: Boolean,
  },
  setup(props: { value: boolean; title: string; disabled: boolean }, ctx) {
    const currentValue = ref(props.value);
    const translatedTitle = computed(() => {
      return props.title.includes('.settings.') ? translate(props.title) : props.title
    })

    function update() {
      currentValue.value = !currentValue.value
      ctx.emit('update', { value: currentValue.value });
    }

    return {
      currentValue,
      translatedTitle,
      update,
      translate,
    }
  }
})
</script>