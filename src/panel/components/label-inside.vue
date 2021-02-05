<template>
  <div ref="label">
    <label ref="inside" class="inside">
      <span>
        <slot></slot>
      </span>
    </label>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, onMounted, Ref, ref, 
} from '@vue/composition-api';

import { getParentBackground } from '../helpers/getParentBackground';

export default defineComponent({
  setup(props, ctx) {
    const label: Ref<HTMLElement | null> = ref(null);
    const inside: Ref<HTMLElement | null> = ref(null);

    onMounted(() => {
      ctx.root.$nextTick(() => {
        if (label.value?.parentElement && inside.value) {
          const color = getParentBackground(label.value);
          inside.value.style.backgroundColor = color;
        }
      });
    });

    return { label, inside };
  },
});
</script>

<style scoped>
div {
  padding-top: 10px;
}
label.inside {
  position:absolute;
  background-color: inherit;
  height: 5px;
  z-index: 9;
  transform: translate(5px, -4px);
  padding: 0 5px;
  -moz-user-select: none;
  -webkit-user-select: none;
  user-select: none;
}
label.inside span {
  position: relative;
  background-color: transparent;
  top: -11px;
}
</style>