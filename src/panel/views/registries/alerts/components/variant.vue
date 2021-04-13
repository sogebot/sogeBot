<template>
  <b-input-group>
    <b-form-select
      v-model="_amount"
      :options="randomOptions"
      class="col"
      plain
    />
  </b-input-group>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';

type Props = {
  event: string; state: boolean; condition: string; amount: number;
};

export default defineComponent({
  props: {
    event: String, state: Boolean, condition: String, amount: Number,
  },
  setup(props: Props, ctx) {
    const _amount = ref(props.amount);

    const randomOptions: { value: number, text: string }[] = [
      { value: 0, text: translate('registry.alerts.very-rarely') },
      { value: 1, text: translate('registry.alerts.rarely') },
      { value: 2, text: translate('registry.alerts.default') },
      { value: 3, text: translate('registry.alerts.frequently') },
      { value: 4, text: translate('registry.alerts.very-frequently') },
      { value: 5, text: translate('registry.alerts.exclusive') },
    ];
    watch(_amount, (val) => {
      ctx.emit('update:amount', val);
    });

    return {
      _amount,
      randomOptions,

      translate,
    };
  },
});
</script>