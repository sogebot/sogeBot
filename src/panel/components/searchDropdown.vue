<template>
  <div>
    <b-input-group>
      <template v-slot:prepend v-if="multiple">
        <ul v-if="currentValue.length > 0" class="list-inline d-inline-block m-0 border border-right-0 px-1"
          :class="{
            'focus-border': (isFocused || isHovered),
            'border-input': !(isFocused || isHovered),
            'border-bottom-0': !isSearching && isDirty && (isFocused || isHovered),
          }">
          <li v-for="tag in currentValue" :key="tag" class="list-inline-item mr-0" style="transform: translateY(4px);">
            <b-form-tag
              style="font-size: 75%; text-transform: initial; font-weight: normal;"
              @remove="removeTag(tag)"
              :title="tag"
              variant="info"
            >{{ tag }}</b-form-tag>
          </li>
        </ul>
      </template>
      <b-input
        class="form-control"
        v-model="addToCurrentValue"
        v-on:keyup="emitSearch"
        v-on:keyup.delete="removeTag()"
        @focus="isFocused = true"
        @blur="isFocused = false"
        :placeholder="placeholder"
        :class="{
          'border-right-0': isSearching,
          'border-left-0': multiple && currentValue.length > 0,
          'border-bottom-0': !isSearching && isDirty && (isFocused || isHovered),
        }"/>
      <template v-slot:append v-if="isSearching">
        <div class="border border-left-0 input-bg" :class="{'focus-border': (isFocused || isHovered), 'border-input': !(isFocused || isHovered) }">
          <b-spinner style="position: relative; top: 2px;" variant="primary" label="Spinning" small class="m-2"></b-spinner>
        </div>
      </template>
      <b-list-group v-if="isDirty && !isSearching && (isFocused || isHovered)"
        @mouseenter="isHovered = true;"
        @mouseleave="isHovered = false;"
        class="focus-border"
        :style="{
          position: 'absolute',
          left: 0,
          'z-index': '99',
          width: 'calc(100%)',
          transform: 'translate3d(0rem, 37px, 0px)',
          'max-height': '14rem',
          overflow: 'auto',
          border: '1px solid',
          'border-top': '0',
        }">
        <b-list-group-item
          v-if="options.length === 0"
          class="btn text-left px-2"
          style="padding-top:0.2rem; padding-bottom:0.2rem"
        >{{ translate('no-options-found-for-this-search') }}
        </b-list-group-item>
        <b-list-group-item
          class="btn text-left px-2"
          style="padding-top:0.2rem; padding-bottom:0.2rem"
          v-for="option of options"
          v-html="option.replace(regexp, '<strong class=\'text-primary\'>' + addToCurrentValue + '</strong>')"
          @click="addToCurrentValue = option; isDirty = showAllOptions; isHovered = false; emitUpdate()"
          :key="option"/>
      </b-list-group>
    </b-input-group>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';
import type { Ref } from '@vue/composition-api';
import { isEqual } from 'lodash';
import translate from 'src/panel/helpers/translate';

interface Props {
  value: string[];
  multiple?: boolean;
  showAllOptions?: boolean;
  options: string[];
  placeholder: string;
}

export default defineComponent({
  props: {
    value: Array,
    multiple: Boolean,
    options: Array,
    placeholder: String,
    showAllOptions: Boolean,
  },
  setup(props: Props, context) {
    const currentValue: Ref<string | string[]> = ref(props.multiple ? [] : '');
    const addToCurrentValue = ref('');
    const isDirty = ref(props.showAllOptions);
    const isSearching = ref(false);
    const isFocused = ref(false);
    const isHovered = ref(false);
    const regexp = ref(new RegExp('', 'gmi'));

    const emitSearch = () => {
      isDirty.value = true;
      isSearching.value = true;
      console.log('emitSearch: ' + addToCurrentValue.value);
      context.emit('search', addToCurrentValue.value);
    };
    const removeTag = (tag?: string) => {
      if (Array.isArray(currentValue.value) && props.multiple) {
        if (tag) {
          currentValue.value.splice(currentValue.value.indexOf(tag), 1);
        } else if (addToCurrentValue.value.length === 0) {
          currentValue.value.pop();
        }
      }
    };
    const emitUpdate = () => {
      if (props.multiple && Array.isArray(currentValue.value)) {
        currentValue.value.push(addToCurrentValue.value);
        addToCurrentValue.value = ''
      } else {
        currentValue.value = addToCurrentValue.value;
      }
      console.log('emitUpdate: ' + currentValue.value);
      context.emit('input', currentValue.value);
    };

    watch(addToCurrentValue, (val) => {
      regexp.value = new RegExp(addToCurrentValue.value, 'gmi');
    });
    watch(() => props.value, (val, oldVal) => {
      if (!isEqual(val, oldVal)) {
        currentValue.value = val;
        if (!props.multiple) {
          addToCurrentValue.value = val[0];
        }
        isDirty.value = props.showAllOptions;
        if (props.showAllOptions) {
          emitSearch();
        }
      }
    });
    watch(() => props.options, (val) => {
      isSearching.value = false;
      // check if current value have game -> emit input
      const lowerCasedOptions: string[] = props.options.map((o: string) => o.toLowerCase());
      if (lowerCasedOptions.includes(addToCurrentValue.value.toLowerCase())) {
        const i = lowerCasedOptions.findIndex(option => option === addToCurrentValue.value.toLowerCase());
        if (i >= 0) {
          currentValue.value = props.options[i];
          addToCurrentValue.value = props.options[i];
          emitUpdate();
        }
      }
    });

    return {
      currentValue,
      addToCurrentValue,
      isDirty,
      isSearching,
      isFocused,
      isHovered,
      regexp,
      emitUpdate,
      removeTag,
      emitSearch,
      translate,
    }
  }
});
</script>

