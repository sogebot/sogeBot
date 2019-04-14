<template>
  <button type="button" ref="button" class="btn btn-with-icon"
          @mouseup="onMouseUp" @mousedown="onMouseDown" @mouseenter="isMouseOver = true" @mouseleave="isMouseOver = false" :disabled="disabled"
          :class="{'btn-only-icon': !this.$slots.title && !this.$slots.onHoldTitle}">
    <div style="display: flex; flex-direction: inherit;">
      <div class="text w-100" :style="{opacity: 1 - this.percentage / 100 }" v-if="!!this.$slots.title || !!this.$slots.onHoldTitle">
        <template v-if="onMouseDownStarted === 0 && !!this.$slots.title">
          <slot name="title"></slot>
        </template>
        <template v-else-if="!!this.$slots.onHoldTitle">
          <slot name="onHoldTitle"></slot>
        </template>
      </div>
      <div class="btn-icon" :style="{opacity: 1 - this.percentage / 100 }">
        <slot name="icon"><fa :icon="icon" fixed-width></fa></slot>
      </div>
    </div>
  </button>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  props: ['ttc', 'icon', 'disabled'],
  data: function () {
    const data: {
      onMouseDownStarted: number,
      isMouseOver: boolean,
      trigger: boolean,
      percentage: number,
      intervals: number[]
    } = {
      onMouseDownStarted: 0,
      isMouseOver: false,
      trigger: false,
      percentage: 0,
      intervals: []
    }
    return data
  },
  watch: {
    trigger: function (val) {
      if (val) {
        this.$emit('trigger')
      }
    },
    isMouseOver: function (val) {
      if (!val) {
        this.onMouseDownStarted = 0
        this.trigger = false
        this.percentage = 0
      }
    }
  },
  destroyed: function () {
    for (let i of this.intervals) clearInterval(i)
  },
  mounted: function () {
    this.intervals.push(window.setInterval(() => this.shouldBeTriggered(), 10))
  },
  methods: {
    shouldBeTriggered: function () {
      const ttc = this.ttc || 1000
      if (this.isMouseOver && this.onMouseDownStarted !== 0) {
        this.percentage = (ttc / 10) * ((Date.now() - this.onMouseDownStarted) / 1000)
        if (this.percentage > 100) this.percentage = 100

        if (Date.now() - this.onMouseDownStarted > ttc) {
          this.trigger = true
        }
      }
    },
    onMouseDown: function () {
      this.onMouseDownStarted = Date.now()
    },
    onMouseUp: function () {
      this.onMouseDownStarted = 0
      this.trigger = false
      this.percentage = 0
    }
  }
})
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
