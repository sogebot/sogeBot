<template>
  <div class="d-flex">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small
            class="text-info"
            data-toggle="tooltip"
            data-html="true"
            :title="translatedTitle.help"
          >[?]</small>
        </template>
      </span>
    </div>
    <select
      v-model="currentValue"
      class="form-control"
      :readonly="readonly"
    >
      <option
        v-for="(v, i) of values"
        :key="i"
      >
        {{ v }}
      </option>
    </select>
  </div>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';

export default defineComponent({
  props: {
    values:   Array,
    value:    String,
    title:    String,
    readonly: Boolean,
  },
  setup(props: { value: string; values: string[]; title: string, readonly: boolean }, ctx) {
    const currentValue = ref(props.value);
    const translatedTitle = ref(translate(props.title));

    watch(currentValue, (val) => {
      ctx.emit('update', { value: currentValue.value });
    });

    return { currentValue, translatedTitle };
  },
});
</script>
