<template>
  <div class="d-flex">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small class="text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <transition-group name="list" tag="ul" class="list-group list-group-flush w-100 border border-input">
      <li class="list-group-item border-0 d-flex" v-for='(v, index) of currentValues' :ref="'list_' + index" :key="v">
        <div class="text-muted btn"
          style="cursor: grab;"
          v-on:dragstart.passive="dragstart(index, $event)"
          v-on:dragend.passive="dragend(index, $event)"
          v-on:dragenter.passive="dragenter(index, $event)"
          draggable="true">
          <fa icon="ellipsis-v"></fa>
        </div>
        <div class="w-100" :key="index">
          <input type="text" class="form-control" v-model="currentValues[index]" readonly="true"/>
        </div>
        <button class="btn btn-outline-dark border-0" @click="toggleItem(index)">
          <fa :icon="isToggled(index) ? toggleofficon : toggleonicon" fixed-width></fa>
        </button>
      </li>
    </transition-group>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api'
import { xor } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faEyeSlash } from '@fortawesome/free-regular-svg-icons';
library.add(faEyeSlash)

import translate from 'src/panel/helpers/translate';

export default defineComponent({
  props: {
    values: Array,
    toggle: Array,
    toggleonicon: String,
    toggleofficon: String,
    title: String,
  },
  setup(props: { values: string[]; toggle: string[], toggleonicon: string, togglefficon: string, title: string }, ctx) {
    const currentValues = ref(props.values);
    const currentToggle = ref(props.toggle);
    const translatedTitle = ref(translate(props.title))
    const draggingItem = ref(-1);

    // Vue 2 composition API workaround to access refs - for Vue 3 -> https://stackoverflow.com/a/62133097
    const refs = ctx.refs

    watch([currentValues, currentToggle], (val) => {
      ctx.emit('update', { value: currentValues.value, toggle: currentToggle.value })
    });

    function toggleItem(idx: number) {
      currentToggle.value = xor(currentToggle.value, [currentValues.value[idx]]);
      ctx.root.$forceUpdate()
    }

    function isToggled (idx: number) {
      const value = currentValues.value[idx]
      return currentToggle.value.indexOf(value) !== -1
    }

    function dragstart(idx: number, e: DragEvent) {
      draggingItem.value = idx;
      e.dataTransfer?.setData('text/plain', 'dummy');
    }

    function dragenter(newIndex: number, e: DragEvent) {
      const value = currentValues.value[draggingItem.value]
      currentValues.value.splice(draggingItem.value, 1);
      currentValues.value.splice(newIndex, 0, value);
      draggingItem.value = newIndex;

      ctx.root.$forceUpdate()
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
    }
  }
});
</script>

<style>
.list-move {
  transition: transform .2s;
}
</style>
