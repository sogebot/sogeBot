<template>
  <span>
    <b-form-group
      :label="translate('registry.overlays.allowedIPs.name')"
      :description="translate('registry.alerts.allowedIPs.help')"
    >
      <b-textarea
        :value="options.allowedIPs.join('\n')"
        rows="5"
        @input="options.allowedIPs = $event.split('\n')"
      />
    </b-form-group>
    <b-button @click="addCurrentIP(options.allowedIPs)">Add current IP</b-button>
  </span>
</template>

<script lang="ts">
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';

import { getCurrentIP } from 'src/panel/helpers/getCurrentIP';
import translate from 'src/panel/helpers/translate';

export default defineComponent({
  props: { opts: Object },
  setup(props, ctx) {
    const options = ref(props.opts);

    watch(options, (val) => {
      ctx.emit('update:opts', val);
    });

    const addCurrentIP = (array: string[]) => {
      getCurrentIP().then(value => {
        if (array[array.length - 1] === '') {
          array[array.length - 1] = value;
        } else {
          array.push(value);
        }
      });
    };

    return {
      addCurrentIP,
      options,
      translate,
    };
  },
});
</script>