<template>
  <div>
    <div
      v-if="!(settings.player.playerId.length === 0 || settings.settings.apiKey.length === 0 || settings.player.seasonId.length === 0)"
      class="float-right"
    >
      <b-button
        :variant="getVariantByState(state.fetching)"
        @click="getPlayerStats"
      >
        <template v-if="state.fetching === ButtonStates.idle">
          {{ translate('integrations.pubg.click_to_fetch') }}
        </template>
        <template v-else-if="state.fetching === ButtonStates.progress">
          <b-spinner small />
        </template>
        <template v-else-if="state.fetching === ButtonStates.fail">
          {{ translate('integrations.pubg.something_went_wrong') }}
          <svg
            width="1.3em"
            height="1.3em"
            viewBox="0 0 16 16"
            class="bi bi-exclamation"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
          </svg>
        </template>
        <template v-else-if="state.fetching === ButtonStates.success">
          {{ translate('integrations.pubg.ok') }}
          <svg
            width="1.3em"
            height="1.3em"
            viewBox="0 0 16 16"
            class="bi bi-check2-circle"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              d="M15.354 2.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L8 9.293l6.646-6.647a.5.5 0 0 1 .708 0z"
            />
            <path
              fill-rule="evenodd"
              d="M8 2.5A5.5 5.5 0 1 0 13.5 8a.5.5 0 0 1 1 0 6.5 6.5 0 1 1-3.25-5.63.5.5 0 1 1-.5.865A5.472 5.472 0 0 0 8 2.5z"
            />
          </svg>
        </template>
      </b-button>
    </div>
    <h4>
      <title-divider v-if="title.toLowerCase().includes('ranked')">
        {{ translate('integrations.pubg.player_stats_ranked') }}
      </title-divider>
      <title-divider v-else>
        {{ translate('integrations.pubg.player_stats') }}
      </title-divider>
    </h4>
    <json-viewer :value="fetchedPlayerStats" />
    <small class="text-muted">{{ translate('integrations.pubg.stats_are_automatically_refreshed_every_10_minutes') }}</small>
  </div>
</template>
<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { defineComponent, ref } from '@vue/composition-api';
import JsonViewer from 'vue-json-viewer';

import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { getVariantByState } from 'src/panel/helpers/variant';

const socket = getSocket('/integrations/pubg');

type Props = {
  value: string; title: string, settings: { [x: string]: any }
};

export default defineComponent({
  components: {
    JsonViewer,
    'title-divider': () => import('src/panel/components/title-divider.vue'),
  },
  props: {
    settings: Object,
    value:    Object,
    title:    String,
  },
  setup(props: Props, ctx) {
    const fetchedPlayerStats = ref(props.value);
    const state = ref({ fetching: ButtonStates.idle } as {
      fetching: number;
    });
    const translatedTitle = translate(props.title);

    const getPlayerStats = () => {
      state.value.fetching = ButtonStates.progress;
      socket.emit('pubg::getUserStats', {
        apiKey:   props.settings?.settings.apiKey,
        platform: props.settings?.player.platform,
        playerId: props.settings?.player.playerId,
        seasonId: props.settings?.player.seasonId,
        ranked:   props.title.toLowerCase().includes('ranked'),
      }, (err: string | null, data: any) => {
        if (err) {
          error(err);
          state.value.fetching = ButtonStates.fail;
        } else {
          if (Object.keys(data).length === 0) {
            error(`No stats found on platform <strong>${props.settings?.player.platform}</strong> for player name <strong>${props.settings?.player.playerName} in season <strong>${props.settings?.player.seasonId}`);
            state.value.fetching = ButtonStates.fail;
          } else {
            state.value.fetching = ButtonStates.success;
            fetchedPlayerStats.value = data;
          }
        }
        setTimeout(() => {
          state.value.fetching = ButtonStates.idle;
        }, 1000);
      });
    };

    return {
      fetchedPlayerStats, getPlayerStats, state, ButtonStates, translatedTitle, getVariantByState, translate,
    };
  },
});
</script>