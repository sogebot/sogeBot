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
    <div class="form-control border-0 h-auto p-0">
      <input
        v-model="_value"
        class="form-control"
      >
      <div class="input-group">
        <div class="input-group-prepend">
          <b-select
            v-model="selectedExampleOption"
            :options="exampleOptions"
          />
        </div>
        <input
          v-model="computedExample"
          class="form-control"
          :readonly="true"
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';
import { escapeRegExp } from 'lodash';

import { flatten } from 'src/bot/helpers/flatten';
import { error } from 'src/panel/helpers/error';

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
    const statsType = props.title.toLowerCase().includes('ranked') ? 'rankedGameModeStats' : 'gameModeStats';
    const _value = ref(props.value);
    const translatedTitle = translate(props.title);
    const computedExample = ref(null as null | string);

    const exampleOptions = computed(() => Object.keys(props.settings?.stats[statsType] || {}));
    const selectedExampleOption = ref(Object.keys(props.settings?.stats[statsType] || {})[0] || null);

    const updateExample = () => {
      if (props.settings) {
        if (selectedExampleOption.value) {
          const dataset = props.settings.stats[statsType][selectedExampleOption.value];
          let text = _value.value || '';
          for (const key of Object.keys(flatten(dataset))) {
            text = text.replace(new RegExp(escapeRegExp(`$${key}`), 'gi'), flatten(dataset)[key]);
          }
          socket.emit('pubg::exampleParse', { text }, (err: string | null, data: any) => {
            if (err) {
              error(err);
            } else {
              computedExample.value = data;
            }
          });
        } else {
          computedExample.value = `Stats not fetched or your user doesn't played any ranked yet`;
        }
      }
    };

    watch(_value, (val) => {
      ctx.emit('update', { value: val });
      updateExample();
    });

    onMounted(() => {
      updateExample();
    });

    return {
      _value, translatedTitle, computedExample, selectedExampleOption, exampleOptions,
    };
  },
});
</script>
