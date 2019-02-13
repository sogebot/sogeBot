<template>
  <button type="button" ref="button" class="btn btn-with-icon" @mouseup="onMouseUp" @mousedown="onMouseDown" @mouseenter="isMouseOver = true" @mouseleave="isMouseOver = false">
    <div style="display: flex; flex-direction: inherit;">
      <div class="text w-100" :style="{opacity: 1 - this.percentage / 100 }">
        <template v-if="onMouseDownStarted === 0">
          <slot name="title"></slot>
        </template>
        <template v-else>
          <slot name="onHoldTitle"></slot>
        </template>
      </div>
      <div class="btn-icon" :style="{opacity: 1 - this.percentage / 100 }">
        <font-awesome-icon :icon="icon" fixed-width></font-awesome-icon>
      </div>
    </div>
  </button>
</template>

<script lang="ts">
import Vue from 'vue';

import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faTrash, faEraser } from '@fortawesome/free-solid-svg-icons';

library.add(faTrash, faEraser)

export default Vue.extend({
props: ['ttc', 'icon'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
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

.btn-reverse > div {
  flex-direction: row-reverse !important;
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
