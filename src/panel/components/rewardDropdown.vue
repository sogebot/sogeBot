<template>
  <span>
    <b-input-group>
      <b-form-select v-model="selectedReward" :options="redeemRewardsWithForcedSelected(selectedReward)"></b-form-select>
      <b-input-group-append>
        <b-button text="Refresh" variant="secondary" @click="refreshRedeemedRewards()"><fa icon="sync" :spin="state.redeemRewards === ButtonStates.progress"/></b-button>
      </b-input-group-append>
    </b-input-group>
    <small><strong>{{ translate("events.myRewardIsNotListed") }}</strong> {{ translate("events.redeemAndClickRefreshToSeeReward") }}</small>
  </span>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from '@vue/composition-api';
import translate from 'src/panel/helpers/translate';
import { getSocket } from 'src/panel/helpers/socket';
import { ButtonStates } from '../helpers/buttonStates';
import { error } from '../helpers/error';

const socket = getSocket('/core/events');

interface Props {
  value: string;
}

export default defineComponent({
  props: {
    value: String,
  },
  setup(props: Props, ctx) {
    const redeemRewards = ref([] as string[]);
    const selectedReward = ref(props.value);
    const state = ref({
      redeemRewards: ButtonStates.progress
    } as { redeemRewards: number })

    const redeemRewardsWithForcedSelected = (selected: string) => {
      socket.emit('events::setRedeemedRewards', selected);
      return Array.from(new Set([selected, ...redeemRewards.value]));
    }
    const refreshRedeemedRewards = async () => {
      state.value.redeemRewards = ButtonStates.progress;
      return new Promise(resolve => {
        socket.emit('events::getRedeemedRewards', (err: string | null, redeems: string[]) => {
          if (err) {
            return error(err);
          }
          redeemRewards.value = redeems;
          setTimeout(() => state.value.redeemRewards = ButtonStates.idle, 1000);
          resolve();
        })
      })
    };

    onMounted(() => {
      refreshRedeemedRewards();
    })

    watch(selectedReward, (val) => {
      ctx.emit('update:value', val);
    })

    return {
      state,
      selectedReward,

      redeemRewardsWithForcedSelected,
      refreshRedeemedRewards,

      translate,
      ButtonStates,
    }
  }
});
</script>

