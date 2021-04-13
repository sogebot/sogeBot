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
      :type="!show ? 'password' : 'text'"
      :readonly="true"
    >
    <div class="input-group-append">
      <b-button
        variant="secondary"
        @mousedown="show = true"
        @mouseup="show=false"
      >
        Show
      </b-button>
      <b-button
        variant="primary"
        :disabled="copied"
        @click="copy"
      >
        {{ copied ? 'Copied!': 'Copy to clipboard' }}
      </b-button>
      <b-button
        variant="danger"
        @click="generate"
      >
        Regenerate
      </b-button>
    </div>
  </div>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';
import { v4 as uuid } from 'uuid';

export default defineComponent({
  props: {
    value: String,
    title: String,
  },
  setup(props: { value: string; title: string }, ctx) {
    const currentValue = ref(props.value);
    const translatedTitle = ref(translate(props.title));
    const show = ref(false);
    const copied = ref(false);

    watch(currentValue, (val) => {
      ctx.emit('update', { value: val });
    });

    function copy() {
      navigator.clipboard.writeText(currentValue.value);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 1000);
    }

    function generate() {
      currentValue.value = uuid();
    }
    return {
      currentValue,
      translatedTitle,
      show,
      copied,

      copy,
      generate,
    };
  },
});
</script>
