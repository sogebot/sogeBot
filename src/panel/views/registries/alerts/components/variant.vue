<template>
  <b-input-group>
    <b-form-select v-model="_condition" :options="options" class="col" plain :disabled="event === 'follow'"></b-form-select>
    <b-form-select v-if="_condition === 'random'" v-model="_amount" :options="randomOptions" class="col" plain></b-form-select>
    <b-form-input
      :state="state"
      v-else
      v-model="_amount"
      type="number"
      min="0"
    ></b-form-input>
  </b-input-group>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Watch } from 'vue-property-decorator';
import translate from 'src/panel/helpers/translate';

@Component({})
export default class Variant extends Vue {
  @Prop() event !: string
  @Prop() state !: boolean
  @PropSync('condition') _condition !: string
  @PropSync('amount') _amount !: number

  translate = translate;

  @Watch('_condition')
  setAmountToZero() {
    if (this._condition === 'random') {
      this._amount = 2; // default
    } else {
      this._amount = 0;
    }
  }

  @Watch('_amount')
  setZeroIfEmpty() {
    if (isNaN(this._amount)) {
      this._amount = 0;
    }
  }

  options: { value: string, text: string }[] = [
    { value: 'random', text: translate('registry.alerts.random') },
    { value: 'exact', text: translate('registry.alerts.exact-amount') },
    { value: 'gt-eq', text: translate('registry.alerts.greater-than-or-equal-to-amount') },
  ]

  randomOptions: { value: number, text: string }[] = [
    { value: 0, text: translate('registry.alerts.very-rarely') },
    { value: 1, text: translate('registry.alerts.rarely') },
    { value: 2, text: translate('registry.alerts.default') },
    { value: 3, text: translate('registry.alerts.frequently') },
    { value: 4, text: translate('registry.alerts.very-frequently') },
  ]
}
</script>