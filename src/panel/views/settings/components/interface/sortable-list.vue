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
    <ul class="list-group list-group-flush w-100 border border-input">
      <template v-for='(v, index) of currentValues'>
        <li class="list-group-item border-0 d-flex" :ref="'list_' + index" :key="index">
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
        <li class="list-group-item border-1" :class="{'d-flex': draggingItem === index, 'd-none': draggingItem !== index }" :key="'empty' + index"
            v-on:dragstart.passive="dragstart(index, $event)"
            v-on:dragend.passive="dragend(index, $event)"
            v-on:dragenter.passive="dragenter(index, $event)"
            draggable="true"
        >
          Dragging
        </li>
      </template>
    </ul>
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
      (refs['list_' + idx] as HTMLElement[])[0].style.opacity = '0.5';
      e.dataTransfer?.setData('text/plain', 'dummy');
    }

    function dragenter(newIndex: number, e: DragEvent) {
      const value = currentValues.value[draggingItem.value]
      currentValues.value.splice(draggingItem.value, 1);
      currentValues.value.splice(newIndex, 0, value);
      draggingItem.value = newIndex;

      for (let i = 0, length = currentValues.value.length; i < length; i++) {
        (refs['list_' + i] as HTMLElement[])[0].style.opacity = '1';
      }
      (refs['list_' + newIndex] as HTMLElement[])[0].style.opacity = '0.5';

      ctx.root.$forceUpdate()
    }

    function dragend(idx: number, e: DragEvent) {
      for (let i = 0, length = currentValues.value.length; i < length; i++) {
        (refs['list_' + i] as HTMLElement[])[0].style.opacity = '1';
        (refs['list_' + i] as HTMLElement[])[0].style.position = 'relative';
        (refs['list_' + i] as HTMLElement[])[0].style.left = '0px';
        (refs['list_' + i] as HTMLElement[])[0].style.top = '0px';
      }
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
