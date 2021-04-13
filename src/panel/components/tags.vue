<template>
  <div>
    <b-input-group>
      <template #prepend>
        <ul
          v-if="currentValue.length > 0"
          class="list-inline d-inline-block m-0 border border-right-0 px-1"
          :class="{
            'focus-border': (isFocused || isHovered),
            'border-input': !(isFocused || isHovered)
          }"
        >
          <li
            v-for="tag in currentValue"
            :key="tag"
            class="list-inline-item mr-0"
            style="transform: translateY(4px);"
          >
            <b-form-tag
              style="font-size: 75%; text-transform: initial; font-weight: normal;"
              :title="tag"
              variant="info"
              @remove="removeTag(tag)"
            >
              {{ tag }}
            </b-form-tag>
          </li>
        </ul>
      </template>
      <b-input
        v-model="addToCurrentValue"
        class="form-control"
        :placeholder="placeholder"
        :class="{
          'border-left-0': currentValue.length > 0,
        }"
        @keyup.delete="removeTag()"
        @keyup.enter="addTag()"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
    </b-input-group>
  </div>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, ref, watch,
} from '@vue/composition-api';
import { isEqual } from 'lodash';

interface Props {
  value: string[];
  ifEmptyTag?: string;
  placeholder: string;
}

export default defineComponent({
  props: {
    value:       Array,
    ifEmptyTag:  String,
    placeholder: String,
  },
  setup(props: Props, context) {
    const currentValue = ref(props.value);
    const addToCurrentValue = ref('');
    const isFocused = ref(false);
    const isHovered = ref(false);

    const addTag = () => {
      if (addToCurrentValue.value.length > 0 && currentValue.value.indexOf(addToCurrentValue.value) === -1) {
        currentValue.value.push(addToCurrentValue.value);
      }
      addToCurrentValue.value = '';
    };
    const removeTag = (tag?: string) => {
      if (tag) {
        currentValue.value.splice(currentValue.value.indexOf(tag), 1);
      } else if (addToCurrentValue.value.length === 0) {
        currentValue.value.pop();
      }

      if (currentValue.value.length === 0) {
        if (props.ifEmptyTag) {
          currentValue.value.push(props.ifEmptyTag);
        }
      }
    };
    const emitUpdate = () => {
      if (Array.isArray(currentValue.value)) {
        currentValue.value.push(addToCurrentValue.value);
        addToCurrentValue.value = '';
      }
      console.log('input: ' + currentValue.value);
      context.emit('input', currentValue.value);
    };
    watch(() => props.value, (val, oldVal) => {
      if (!isEqual(val, oldVal)) {
        currentValue.value = val;
      }
    });

    return {
      currentValue,
      addToCurrentValue,
      isFocused,
      isHovered,
      emitUpdate,
      addTag,
      removeTag,
      translate,
    };
  },
});
</script>
