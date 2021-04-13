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
    <input
      v-model="currentValue"
      class="form-control"
    >
    <div
      class="input-group-append"
    >
      <b-button
        :variant="getVariantByState(state)"
        @click="validate"
      >
        <template v-if="state === ButtonStates.idle">
          Set current active device
        </template>
        <template v-else-if="state === ButtonStates.progress">
          <b-spinner small />
        </template>
      </b-button>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';

import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { getSocket } from 'src/panel/helpers/socket';
import translate from 'src/panel/helpers/translate';
import { getVariantByState } from 'src/panel/helpers/variant';

export default defineComponent({
  props: {
    value:        String,
    defaultValue: String,
    title:        String,
    type:         String,
    readonly:     Boolean,
  },
  setup(props: { value: string | number; title: string, defaultValue: string, type: string, readonly: boolean }, ctx) {
    const socket = getSocket('/integrations/spotify');

    const currentValue = ref(props.value);
    const translatedTitle = ref(translate(props.title));
    const state = ref(ButtonStates.idle as number);

    watch(currentValue, (val) => {
      ctx.emit('update', { value: val });
    });

    async function validate() {

      state.value = ButtonStates.progress;
      socket.emit('get.value', 'lastActiveDeviceId', (err: null | string, value: string) => {
        if (err) {
          error(err);
        }
        currentValue.value = value;
        state.value = ButtonStates.idle;
      });
    }

    return {
      currentValue,
      translatedTitle,
      state,
      validate,

      getVariantByState,
      ButtonStates,
      translate,
    };
  },
});
</script>
