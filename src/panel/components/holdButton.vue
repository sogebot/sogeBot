<template>
  <button type="button" ref="button" class="btn btn-with-icon"
          @mouseup="onMouseUp" @mousedown="onMouseDown" @mouseenter="isMouseOver = true" @mouseleave="isMouseOver = false" :disabled="disabled"
          :class="{'btn-only-icon': !this.$slots.title && !this.$slots.onHoldTitle, 'btn-sm': small ? true : false }">
    <div style="display: flex; flex-direction: inherit;">
      <div class="text w-100" :style="{opacity: 1 - percentage / 100 }" v-if="!!this.$slots.title || !!this.$slots.onHoldTitle">
        <template v-if="onMouseDownStarted === 0 && !!this.$slots.title">
          <slot name="title"></slot>
        </template>
        <template v-else-if="!!this.$slots.onHoldTitle">
          <slot name="onHoldTitle"></slot>
        </template>
      </div>
      <div v-if="icon || !!this.$slots.icon" class="btn-icon" :style="{opacity: 1 - percentage / 100 }">
        <slot name="icon"><fa :icon="icon" fixed-width></fa></slot>
      </div>
    </div>
  </button>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, onUnmounted } from '@vue/composition-api'

interface Props {
  ttc: number;
  icon: string;
  disabled?: boolean;
  small?: boolean
}
export default defineComponent({
  props: {
    ttc: Number,
    icon: String,
    disabled: Boolean,
    small: Boolean,
  },
  setup(props: Props, context) {
    const intervals: number[] = [];
    const onMouseDownStarted = ref(0);
    const isMouseOver = ref(false);
    const trigger = ref(false);
    const percentage = ref(0);

    const shouldBeTriggered = () => {
      const ttc = props.ttc || 1000
      if (isMouseOver.value && onMouseDownStarted.value !== 0) {
        percentage.value = (ttc / 10) * ((Date.now() - onMouseDownStarted.value) / 1000)
        if (percentage.value > 100) percentage.value = 100

        if (Date.now() - onMouseDownStarted.value > ttc) {
          trigger.value = true
        }
      }
    }

    const onMouseDown = () => {
      onMouseDownStarted.value = Date.now()
    };

    const onMouseUp = () => {
      onMouseDownStarted.value = 0
      trigger.value = false
      percentage.value = 0
    };

    onMounted(() => {
      intervals.push(window.setInterval(() => shouldBeTriggered(), 10))
    });
    onUnmounted(() => {
      for (let i of intervals) clearInterval(i)
    })

    watch(trigger, (val) => {
      if (val) {
        context.emit('trigger')
      }
    })
    watch(isMouseOver, (val) => {
      if (!val) {
        onMouseDownStarted.value = 0
        trigger.value = false
        percentage.value = 0
      }
    })

    return {
      onMouseDownStarted, isMouseOver, percentage, onMouseDown, onMouseUp
    }
  }
});
</script>

<style scoped>
@media only screen and (max-width: 1000px) {
  .btn-shrink {
    padding: 0!important;
  }
  .btn-shrink .text {
    display: none !important;
  }
  .btn-shrink .btn-icon {
    background: transparent !important;
  }
}

.btn-only-icon .text {
  display: none !important;
}
.btn-only-icon .btn-icon {
  background: transparent !important;
}

.btn-with-icon {
  padding: 0;
  display: inline-block;
  width: fit-content;
}

.btn-with-icon .btn-icon {
  display: inline-block;
  padding: 0.375rem 0.4rem;
  background: rgba(0,0,0,0.15);
  flex-shrink: 10;
}

.btn-with-icon .text {
  padding: 0.375rem 0.4rem;
}
</style>
