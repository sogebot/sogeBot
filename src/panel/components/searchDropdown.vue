<template>
  <div>
    <b-input-group>
      <template v-slot:prepend v-if="typeof multiple === 'string'">
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
          'border-left-0': typeof multiple === 'string' && currentValue.length > 0,
          'border-bottom-0': !isSearching && isDirty && (isFocused || isHovered),
        }"/>
      <template v-slot:append v-if="isSearching">
        <div class="border border-left-0" :class="{'focus-border': (isFocused || isHovered), 'border-input': !(isFocused || isHovered) }">
          <b-spinner variant="primary" label="Spinning" small class="m-2"></b-spinner>
        </div>
      </template>
    </b-input-group>
    <b-list-group v-if="isDirty && !isSearching && (isFocused || isHovered)"
      @mouseenter="isHovered = true;"
      @mouseleave="isHovered = false;"
      class="focus-border"
      :style="{
        position: 'absolute',
        left: 0,
        'z-index': '99',
        width: 'calc(100% - 2rem)',
        transform: 'translate3d(1rem, 0px, 0px)',
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
        @click="addToCurrentValue = option; isDirty = false; isHovered = false; emitUpdate()"
        :key="option"/>
    </b-list-group>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  props: ['value', 'placeholder', 'options', 'multiple'],
  data: function () {
    const data: {
      currentValue: string | string[],
      addToCurrentValue: string,
      isDirty: boolean,
      isSearching: boolean,
      isFocused: boolean,
      isHovered: boolean,
      regexp: RegExp,
    } = {
      currentValue: '',
      addToCurrentValue: '',
      isDirty: false,
      isSearching: false,
      isFocused: false,
      isHovered: false,
      regexp: new RegExp('', 'gmi'),
    }
    return data
  },
  watch: {
    addToCurrentValue: function(val) {
      this.regexp = new RegExp(this.addToCurrentValue, 'gmi');
    },
    value: function (val) {
      if (val) {
        this.currentValue = val;
        if (typeof this.multiple === 'undefined') {
          this.addToCurrentValue = val;
        }
        this.isDirty = false;
      }
    },
    options: function(val) {
      this.isSearching = false;
      // check if current value have game -> emit inout
      const lowerCasedOptions: string[] = this.options.map((o: string) => o.toLowerCase());
      if (lowerCasedOptions.includes(this.addToCurrentValue.toLowerCase())) {
        const i = lowerCasedOptions.findIndex(option => option === this.addToCurrentValue.toLowerCase());
        if (i >= 0) {
          this.currentValue = this.options[i];
          this.addToCurrentValue = this.options[i];
          this.emitUpdate();
        }
      }
    }
  },
  methods: {
    emitSearch: function () {
      this.isDirty = true;
      this.isSearching = true;
      console.log('emitSearch: ' + this.addToCurrentValue);
      this.$emit('search', this.addToCurrentValue);
    },
    removeTag: function(tag?: string) {
      if (Array.isArray(this.currentValue) && typeof this.multiple !== 'undefined') {
        if (tag) {
          this.currentValue.splice(this.currentValue.indexOf(tag), 1);
        } else if (this.addToCurrentValue.length === 0) {
          this.currentValue.pop();
        }
      }
    },
    emitUpdate: function () {
      if (typeof this.multiple === 'string' && Array.isArray(this.currentValue)) {
        this.currentValue.push(this.addToCurrentValue);
        this.addToCurrentValue = ''
      } else {
        this.currentValue = this.addToCurrentValue;
      }
      console.log('emitUpdate: ' + this.currentValue);
      this.$emit('input', this.currentValue);
    }
  }
});
</script>

