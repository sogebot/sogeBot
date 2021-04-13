<template>
  <div class="d-flex">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small
            class="text-info"
            data-toggle="tooltip"
            data-html="true"
            :title="translatedTitle.help"
          >[?]</small>
        </template>
      </span>
    </div>
    <ul class="list-group list-group-flush w-100 border border-input">
      <li
        v-for="(v, index) of currentValues"
        :key="index"
        class="list-group-item border-0 d-flex"
      >
        <div
          :key="index"
          class="w-100"
        >
          <input
            v-model="v.url"
            type="text"
            class="form-control"
            readonly="true"
          >
        </div>
        <button
          class="btn"
          :class="{ 'btn-success': v.clip, 'btn-danger': !v.clip }"
          @click="v.clip = !v.clip"
        >
          CLIP
        </button>
        <button
          class="btn"
          :class="{ 'btn-success': v.highlight, 'btn-danger': !v.highlight }"
          @click="v.highlight = !v.highlight"
        >
          HIGHLIGHT
        </button>

        <button
          class="btn btn-outline-dark border-0"
          @click="removeItem(index)"
        >
          <fa icon="times" />
        </button>
      </li>
      <li class="list-group-item">
        <button
          class="btn btn-success"
          type="button"
          @click="currentValues.push({
            url: origin + '/highlights/' + v4(),
            clip: false,
            highlight: false,
          })"
        >
          <fa icon="plus" /> Generate new url
        </button>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, ref, watch,
} from '@vue/composition-api';
import { v4 } from 'uuid';

import type { default as Highlights } from 'src/bot/systems/highlights';

export default defineComponent({
  props: {
    values: Array,
    title:  String,
  },
  setup(props: { values: typeof Highlights['urls']; title: string }, ctx) {
    const currentValues = ref(props.values);
    const translatedTitle = ref(translate(props.title));
    const origin = computed(() => window.location.origin);

    watch(currentValues, (val) => {
      ctx.emit('update', { value: val });
    }, { deep: true });

    function removeItem(index: number) {
      currentValues.value.splice(index, 1);
    }
    return {
      currentValues,
      translatedTitle,
      origin,
      removeItem,
      v4,
    };
  },
});
</script>