<template>
  <b-container class="p-0">
    <b-row>
      <b-col><b-form-select v-model="animType" :options="options" class="col" plain></b-form-select></b-col>
      <b-col><div class="char d-inline-block animated infinite slow" :class="[animType]" :style="{'animation-delay' : (index * 50) + 'ms'}" v-for="(char, index) of text.split('')" v-bind:key="char + index">{{ char === ' ' ? '&nbsp;' : char }}</div></b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';

require('../../../../../../scss/letter-animations.css');
require('animate.css');

@Component({})
export default class TextAnimation extends Vue {
  @PropSync('animation') readonly animType !: string

  text: string = 'Sample text'

  options: { value: string, text: string }[] = [
    { value: 'none', text: 'none' },
    { value: 'bounce', text: 'bounce' },
    { value: 'bounce2', text: 'bounce2' },
    { value: 'flip', text: 'flip' },
    { value: 'flash', text: 'flash' },
    { value: 'pulse2', text: 'pulse' },
    { value: 'rubberBand', text: 'rubberBand' },
    { value: 'shake2', text: 'shake' },
    { value: 'swing', text: 'swing' },
    { value: 'tada', text: 'tada' },
    { value: 'wave', text: 'wave' },
    { value: 'wobble', text: 'wobble' },
    { value: 'wiggle', text: 'wiggle' },
    { value: 'wiggle2', text: 'wiggle2' },
    { value: 'jello', text: 'jello' },
  ]
}
</script>

<style scoped>
.char {
  font-size: 1.5rem;
  font-weight: bold;
}
</style>
