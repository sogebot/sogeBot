<template>
  <b-input-group>
    <b-form-select v-model="_condition" :options="options" class="col" plain :disabled="disabled"></b-form-select>
    <b-form-select v-if="_condition === 'random'" v-model="_amount" :options="randomOptions" class="col" plain></b-form-select>
    <b-form-select v-else-if="_condition.includes('tier')" v-model="_amount" :options="tierOptions" class="col" plain></b-form-select>
    <b-form-input
      :state="state"
      v-else
      v-model.number="_amount"
      type="number"
      min="0"
    ></b-form-input>
  </b-input-group>
</template>

<script lang="ts">
import { defineComponent, computed, watch, ref } from '@vue/composition-api'
import translate from 'src/panel/helpers/translate';

type Props = {
  event: string; state: boolean; condition: string; amount: number;
}

export default defineComponent({
  props: {
    event: String, state: Boolean, condition: String, amount: Number,
  },
  setup(props: Props, ctx) {
    const _condition = ref(props.condition);
    const _amount = ref(props.amount);
    const disabled = computed(() => {
      switch(props.event) {
        case 'follows':
          return true;
        default:
          return false;
      }
    });
    const options = computed(() => {
      switch(props.event) {
        case 'follows':
        case 'rewardredeems':
          return [
            { value: 'random', text: translate('registry.alerts.random') }
          ]
        case 'subs':
          return [
            { value: 'random', text: translate('registry.alerts.random') },
            { value: 'tier-exact', text: translate('registry.alerts.tier-exact-amount') },
            { value: 'tier-gt-eq', text: translate('registry.alerts.tier-greater-than-or-equal-to-amount') },
          ]
        case 'resubs':
          return [
            { value: 'random', text: translate('registry.alerts.random') },
            { value: 'exact', text: translate('registry.alerts.months-exact-amount') },
            { value: 'gt-eq', text: translate('registry.alerts.months-greater-than-or-equal-to-amount') },
            { value: 'tier-exact', text: translate('registry.alerts.tier-exact-amount') },
            { value: 'tier-gt-eq', text: translate('registry.alerts.tier-greater-than-or-equal-to-amount') },
          ]
        case 'subcommunitygifts':
          return [
            { value: 'random', text: translate('registry.alerts.random') },
            { value: 'exact', text: translate('registry.alerts.gifts-exact-amount') },
            { value: 'gt-eq', text: translate('registry.alerts.gifts-greater-than-or-equal-to-amount') },
          ]
        case 'subgifts':
          return [
            { value: 'random', text: translate('registry.alerts.random') },
            { value: 'exact', text: translate('registry.alerts.months-exact-amount') },
            { value: 'gt-eq', text: translate('registry.alerts.months-greater-than-or-equal-to-amount') },
          ]
        default:
          return [
            { value: 'random', text: translate('registry.alerts.random') },
            { value: 'exact', text: translate('registry.alerts.exact-amount') },
            { value: 'gt-eq', text: translate('registry.alerts.greater-than-or-equal-to-amount') },
          ]
      }
    })

    const tierOptions: { value: number, text: string }[] = [
      { value: 0, text: 'Prime' },
      { value: 1, text: '1' },
      { value: 2, text: '2' },
      { value: 3, text: '3' },
    ]

    const randomOptions: { value: number, text: string }[] = [
      { value: 0, text: translate('registry.alerts.very-rarely') },
      { value: 1, text: translate('registry.alerts.rarely') },
      { value: 2, text: translate('registry.alerts.default') },
      { value: 3, text: translate('registry.alerts.frequently') },
      { value: 4, text: translate('registry.alerts.very-frequently') },
    ]
    watch(_condition, (val) => {
      if (_condition.value === 'random') {
        _amount.value = 2; // default
      } else {
        switch(props.event) {
          case 'subs':
          case 'resubs':
            _amount.value = 1;
          default:
            _amount.value = 0;
        }
      }
      ctx.emit('update:condition', val);
    })
    watch(_amount, (val) => {
      if (Number.isNaN(_amount.value)) {
        _amount.value = 0;
      }
      ctx.emit('update:amount', val);
    })

    return {
      _condition,
      _amount,
      options,
      randomOptions,
      disabled,
      tierOptions,

      translate,
    }
  }
})
</script>