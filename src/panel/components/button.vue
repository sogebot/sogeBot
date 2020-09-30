<template>
  <a
    v-if="href"
    :href="href"
    class="btn btn-with-icon"
    :target="target">
    <div style="display: flex">
      <div class="text">
        <slot>{{text}}</slot>
      </div>
      <div class="btn-icon" v-if="icon">
        <fa :icon="icon" fixed-width v-if="spin" spin></fa>
        <fa :icon="icon" fixed-width v-else></fa>
      </div>
    </div>
  </a>
  <button v-else type="button" class="btn btn-with-icon" style="flex-direction: row;"
    @click="$emit(event || 'click')" :disabled="disabled">
    <div style="display: flex">
      <div class="text">
        <slot>{{text}}</slot>
      </div>

      <div v-if="icon || !!this.$slots.icon" class="btn-icon">
        <slot v-if="!!this.$slots.icon" name="icon"></slot>
        <template v-else>
          <fa :icon="icon" fixed-width v-if="spin" spin></fa>
          <fa :icon="icon" fixed-width v-else></fa>
        </template>
      </div>
    </div>
  </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api'

export default defineComponent({
  props: {
    text: String,
    href: String,
    icon: [String, Array, Boolean],
    target: String,
    spin: Boolean,
    disabled: Boolean,
    event: String
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

.btn-with-icon .text + .btn-icon {
  background: rgba(0,0,0,0.15);
}

.btn-with-icon .btn-icon {
  display: inline-block;
  padding: 0.375rem 0.4rem;
  flex-shrink: 10;
}

.btn-with-icon .text {
  padding: 0.375rem 0.4rem;
}
</style>
