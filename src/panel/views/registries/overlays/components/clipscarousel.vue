<template>
  <span>
    <b-form-group
      :label="translate('volume')"
    >
      <b-input-group append="%">
        <b-input
          v-model.number="options.volume"
          type="number"
          min="0"
          max="100"
        />
      </b-input-group>
    </b-form-group>
  </span>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';

const prepareOpts = (data: any) => {
  if (!data || data.volume === null || typeof data.volume === 'undefined') {
    return { volume: 0 };
  } else {
    return { volume: data.volume as number };
  }
};

export default defineComponent({
  props: { opts: Object },
  setup(props: any, ctx) {
    const options = ref(prepareOpts(props.opts));

    watch(options, (val: any) => {
      if (val.volume < 0) {
        val.volume = 0;
      }

      if (val.volume > 100) {
        val.volume = 100;
      }

      if (String(val.volume) === '') {
        val.volume = 0;
      }

      ctx.emit('update:opts', val);
    }, { deep: true });

    return {
      options,
      translate,
    };
  },
});
</script>