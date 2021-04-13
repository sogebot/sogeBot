<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">
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
      </span>
    </div>
    <b-input
      v-if="settings.settings.apiKey.length === 0"
      class="form-control"
      :readonly="true"
      value="Fill apiKey to fetch seasonId"
      variant="danger"
    />
    <b-input
      v-else
      v-model="fetchedSeasonId"
      class="form-control"
      :readonly="true"
    />
    <div
      v-if="settings.settings.apiKey.length !== 0"
      class="input-group-append"
    >
      <b-button
        :variant="getVariantByState(state.fetching)"
        @click="getSeasonId"
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
  </div>
</template>
<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { defineComponent, ref } from '@vue/composition-api';

import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { getVariantByState } from 'src/panel/helpers/variant';

const socket = getSocket('/integrations/pubg');

type Props = {
  value: string; title: string, settings: { [x: string]: any }
};

export default defineComponent({
  props: {
    settings: Object,
    value:    String,
    title:    String,
  },
  setup(props: Props, ctx) {
    const fetchedSeasonId = ref(props.value);
    const state = ref({ fetching: ButtonStates.idle } as {
      fetching: number;
    });
    const translatedTitle = translate(props.title);

    const getSeasonId = () => {
      state.value.fetching = ButtonStates.progress;
      socket.emit('pubg::searchForseasonId', { apiKey: props.settings?.settings.apiKey, platform: props.settings?.player.platform }, (err: string | null, data: any) => {
        if (err) {
          error(err);
          state.value.fetching = ButtonStates.fail;
        } else {
          if (data.data.length === 0) {
            error(`No season found on platform <strong>${props.settings?.player.platform}</strong>`);
            state.value.fetching = ButtonStates.fail;
          } else {
            state.value.fetching = ButtonStates.success;
            fetchedSeasonId.value = data.data[0].id;
            ctx.emit('update', { value: data.data[0].id });
          }
        }
        setTimeout(() => {
          state.value.fetching = ButtonStates.idle;
        }, 1000);
      });
    };

    return {
      fetchedSeasonId, getSeasonId, state, ButtonStates, translatedTitle, getVariantByState,
    };
  },
});
</script>