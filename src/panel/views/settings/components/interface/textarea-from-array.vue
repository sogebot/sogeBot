<template>
  <b-input-group>
    <template #prepend>
      <span class="input-group-text text-left d-block">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else-if="typeof translatedTitle === 'object'">
          {{ translatedTitle.title }}
          <small
            style="cursor: help;"
            class="text-info ml-1"
            data-toggle="tooltip"
            data-html="true"
            :title="translatedTitle.help"
          >[?]</small>
        </template>
        <small class="d-block">{{ translate('one-record-per-line') }}</small>
      </span>
    </template>

    <b-textarea
      v-model="hiddenOrCurrentValue"
      class="form-control"
      rows="5"
      type="text"
      :readonly="readonly"
      @update="currentValue = $event"
      @focus="showHiddenValue = false"
      @blur="showHiddenValue = true"
    />
  </b-input-group>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  computed,
  defineComponent, ref, watch,
} from '@vue/composition-api';

export default defineComponent({
  props: {
    value:    Array,
    title:    String,
    readonly: Boolean,
    secret:   Boolean,
  },
  setup(props: { value: string[]; title: string; readonly: boolean; secret: boolean }, ctx) {
    const currentValue = ref(props.value.join('\n'));
    const hiddenValue = ref(props.value.map(val => val.replace(/\S/g, '*')).join('\n'));
    const showHiddenValue = ref(true);
    const translatedTitle = ref(translate(props.title));

    const hiddenOrCurrentValue = computed(() => 
      showHiddenValue.value && props.secret ? hiddenValue.value : currentValue.value,
    );

    watch(currentValue, (val) => {
      ctx.emit('update', { value: val.split('\n') });
      hiddenValue.value = val.split('\n').map(val2 => val2.replace(/\S/g, '*')).join('\n');
    });

    return {
      currentValue,
      hiddenValue,
      showHiddenValue,
      translatedTitle,
      translate,
      hiddenOrCurrentValue,
    };
  },
});
</script>