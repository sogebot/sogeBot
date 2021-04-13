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
      :type="secret && !show ? 'password' : 'text'"
      :readonly="readonly"
      @focus="show = true"
      @blur="show = false"
    >
    <div
      v-if="!secret && defaultValue !== currentValue && !readonly"
      class="input-group-append"
    >
      <b-button @click="currentValue = defaultValue">
        <fa
          icon="history"
          fixed-width
        />
      </b-button>
    </div>
  </div>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';
import { isFinite } from 'lodash-es';

export default defineComponent({
  props: {
    value:        [String, Number],
    defaultValue: String,
    title:        String,
    type:         String,
    readonly:     Boolean,
    secret:       Boolean,
  },
  setup(props: { value: string | number; title: string, defaultValue: string, type: string, readonly: boolean, secret: boolean }, ctx) {
    const currentValue = ref(props.value);
    const translatedTitle = ref(translate(props.title));
    const show = ref(false);

    watch(currentValue, (val) => {
      if (props.type === 'number') {
        if (isFinite(Number(val))) {
          val = Number(val);
        } else {
          val = props.value;
        }
      }
      ctx.emit('update', { value: val });
    });

    return {
      currentValue,
      translatedTitle,
      show,
      translate,
    };
  },
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>