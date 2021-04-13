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
    <transition-group
      name="list"
      tag="ul"
      class="list-group list-group-flush w-100 border border-input"
    >
      <li
        v-for="(v, index) of currentValues"
        :ref="'list_' + index"
        :key="v"
        class="list-group-item border-0 d-flex"
      >
        <div
          class="text-muted btn"
          style="cursor: grab;"
          draggable="true"
          @dragstart.passive="dragstart(index, $event)"
          @dragend.passive="dragend(index, $event)"
          @dragenter.passive="dragenter(index, $event)"
        >
          <fa icon="ellipsis-v" />
        </div>
        <div
          :key="index"
          class="w-100"
        >
          <input
            v-model="currentValues[index]"
            type="text"
            class="form-control"
            readonly="true"
          >
        </div>
        <button
          class="btn btn-outline-dark border-0"
          @click="toggleItem(index)"
        >
          <fa
            :icon="isToggled(index) ? toggleofficon : toggleonicon"
            fixed-width
          />
        </button>
      </li>
    </transition-group>
  </div>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';
import { xor } from 'lodash-es';

library.add(faEyeSlash);

export default defineComponent({
  props: {
    values:        Array,
    toggle:        Array,
    toggleonicon:  String,
    toggleofficon: String,
    title:         String,
  },
  setup(props: { values: string[]; toggle: string[], toggleonicon: string, togglefficon: string, title: string }, ctx) {
    const currentValues = ref(props.values);
    const currentToggle = ref(props.toggle);
    const translatedTitle = ref(translate(props.title));
    const draggingItem = ref(-1);

    watch([currentValues, currentToggle], (val) => {
      ctx.emit('update', { value: currentValues.value, toggle: currentToggle.value });
    });

    function toggleItem(idx: number) {
      currentToggle.value = xor(currentToggle.value, [currentValues.value[idx]]);
      ctx.root.$forceUpdate();
    }

    function isToggled (idx: number) {
      const value = currentValues.value[idx];
      return currentToggle.value.indexOf(value) !== -1;
    }

    function dragstart(idx: number, e: DragEvent) {
      draggingItem.value = idx;
      e.dataTransfer?.setData('text/plain', 'dummy');
    }

    function dragenter(newIndex: number, e: DragEvent) {
      const value = currentValues.value[draggingItem.value];
      currentValues.value.splice(draggingItem.value, 1);
      currentValues.value.splice(newIndex, 0, value);
      draggingItem.value = newIndex;

      ctx.root.$forceUpdate();
    }

    function dragend(idx: number, e: DragEvent) {
      draggingItem.value = -1;
    }

    return {
      currentValues,
      currentToggle,
      translatedTitle,

      draggingItem,
      toggleItem,
      isToggled,
      dragstart,
      dragenter,
      dragend,

      translate,
    };
  },
});
</script>

<style>
.list-move {
  transition: transform .2s;
}
</style>
