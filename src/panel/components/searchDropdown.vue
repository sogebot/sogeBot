<template>
  <div>
    <b-input-group>
      <b-input
        class="form-control"
        v-model="currentValue"
        v-on:keyup="emitSearch"
        @focus="isFocused = true"
        @blur="isFocused = false"
        :placeholder="placeholder"
        :class="{
          'border-right-0': isSearching,
          'border-bottom-0': !isSearching && options.length > 0 && isDirty && (isFocused || isHovered),
        }"/>
      <template v-slot:append v-if="isSearching">
        <div class="border border-left-0" :class="{'focus-border': (isFocused || isHovered), 'border-input': !(isFocused || isHovered) }">
          <b-spinner variant="primary" label="Spinning" small class="m-2"></b-spinner>
        </div>
      </template>
    </b-input-group>
    <b-list-group v-if="options.length > 0 && isDirty && !isSearching && (isFocused || isHovered)"
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
        class="btn text-left px-2"
        style="padding-top:0.2rem; padding-bottom:0.2rem"
        v-for="option of options"
        v-html="option.replace(regexp, '<strong class=\'text-primary\'>' + currentValue + '</strong>')"
        @click="currentValue = option; isDirty = false; isHovered = false; emitUpdate()"
        :key="option"/>
    </b-list-group>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  props: ['value', 'placeholder', 'options'],
  data: function () {
    const data: {
      currentValue: string,
      isDirty: boolean,
      isSearching: boolean,
      isFocused: boolean,
      isHovered: boolean,
      regexp: RegExp,
    } = {
      currentValue: '',
      isDirty: false,
      isSearching: false,
      isFocused: false,
      isHovered: false,
      regexp: new RegExp('', 'gmi'),
    }
    return data
  },
  watch: {
    currentValue: function(val) {
      this.regexp = new RegExp(this.currentValue, 'gmi');
    },
    value: function (val) {
      if (val) {
        this.currentValue = val;
        this.isDirty = false;
      }
    },
    options: function(val) {
      this.isSearching = false;
      // check if current value have game -> emit inout
      const lowerCasedOptions: string[] = this.options.map((o: string) => o.toLowerCase());
      if (lowerCasedOptions.includes(this.currentValue.toLowerCase())) {
        const i = lowerCasedOptions.findIndex(option => option === this.currentValue.toLowerCase());
        if (i >= 0) {
          this.currentValue = this.options[i];
          this.emitUpdate();
        }
      }
    }
  },
  methods: {
    emitSearch: function () {
      this.isDirty = true;
      this.isSearching = true;
      console.log('emitSearch: ' + this.currentValue);
      this.$emit('search', this.currentValue);
    },
    emitUpdate: function () {
      console.log('emitUpdate: ' + this.currentValue);
      this.$emit('input', this.currentValue);
    }
  }
});
</script>

