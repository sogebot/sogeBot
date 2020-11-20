<template>
  <span>
    <b-input-group>
      <b-form-select v-model="selectedReward" :options="redeemRewardsWithForcedSelected(selectedReward)" :state="state"></b-form-select>
      <b-input-group-append>
        <b-button text="Refresh" variant="secondary" @click="refreshRedeemedRewards()"><fa icon="sync" :spin="progress.redeemRewards === ButtonStates.progress"/></b-button>
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
  state: boolean | null;
}

export default defineComponent({
  props: {
    value: String,
    state: [Boolean, Object],
  },
  setup(props: Props, ctx) {
    const redeemRewards = ref([] as string[]);
    const selectedReward = ref(props.value);
    const progress = ref({
      redeemRewards: ButtonStates.progress
    } as { redeemRewards: number })

    const redeemRewardsWithForcedSelected = (selected: string) => {
      return Array.from(new Set([selected, ...redeemRewards.value]));
    }
    const refreshRedeemedRewards = async () => {
      progress.value.redeemRewards = ButtonStates.progress;
      return new Promise<void>(resolve => {
        socket.emit('events::getRedeemedRewards', (err: string | null, redeems: string[]) => {
          if (err) {
            return error(err);
          }
          redeemRewards.value = redeems;
          setTimeout(() => progress.value.redeemRewards = ButtonStates.idle, 1000);
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
      progress,
      selectedReward,

      redeemRewardsWithForcedSelected,
      refreshRedeemedRewards,

      translate,
      ButtonStates,
    }
  }
});
</script>

