<template>
  <b-container class="p-0">
    <b-row>
      <b-col><b-form-select v-model="animType" :options="options" class="col" plain></b-form-select></b-col>
      <b-col v-if="animType !== 'baffle'">
        <div class="char d-inline-block animate__animated animate__infinite" :class="['animate__' + animType, 'animate__' + animOptions.speed]" :style="{'animation-delay' : (index * 50) + 'ms'}" v-for="(char, index) of text.split('')" v-bind:key="char + index">{{ char === ' ' ? '&nbsp;' : char }}</div>
      </b-col>
      <b-col v-else>
        <baffle class="char" text="Sample text" :options="animOptions"/>
      </b-col>
    </b-row>
    <b-row v-if="!['baffle', 'wiggle', 'wiggle2' ,'wave'].includes(animType)" class="pt-2">
      <b-col>
        <b-form-group
          label-cols-sm="4"
          label-cols-lg="3"
          :label="translate('registry.alerts.speed.name')"
          label-for="speed"
        >
          <b-form-select v-model="animOptions.speed" :options="speedOptions" class="col" plain />
        </b-form-group>
      </b-col>
    </b-row>
    <template v-if="['baffle'].includes(animType)">
      <b-row class="pt-2">
        <b-col>
          <b-form-group
            class="m-0"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.speed.name')"
            label-for="speed"
          >
            <b-form-input
              id="speed"
              v-model="animOptions.speed"
              type="number"
              min="0"
              :label="translate('registry.alerts.speed.name')"
            ></b-form-input>
          </b-form-group>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <b-form-group
            class="m-0"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.maxTimeToDecrypt.name')"
            label-for="maxTimeToDecrypt"
          >
            <b-form-input
              id="maxTimeToDecrypt"
              v-model="animOptions.maxTimeToDecrypt"
              type="number"
              min="0"
              :label="translate('registry.alerts.maxTimeToDecrypt.name')"
            ></b-form-input>
          </b-form-group>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <b-form-group
            class="m-0"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.characters.name')"
            label-for="characters"
          >
            <b-form-input
              id="characters"
              v-model="animOptions.characters"
              :label="translate('registry.alerts.characters.name')"
            ></b-form-input>
          </b-form-group>
        </b-col>
      </b-row>
    </template>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, PropSync, Watch } from 'vue-property-decorator';

require('../../../../../../scss/letter-animations.css');
require('animate.css');

@Component({
  components: {
    'baffle': () => import('src/panel/components/baffle.vue'),
  }
})
export default class TextAnimation extends Vue {
  @PropSync('animation') readonly animType !: string
  @PropSync('animationOptions') readonly animOptions !: any;

  text: string = 'Sample text'

  speedOptions: { value: string, text: string }[] = [
    { value: 'slower', text: 'slower' },
    { value: 'slow', text: 'slow' },
    { value: 'fast', text: 'fast' },
    { value: 'faster', text: 'faster' },
  ]

  options: { value: string, text: string }[] = [
    { value: 'none', text: 'none' },
    { value: 'baffle', text: 'baffle' },
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

  @Watch('animType')
  setSpeed() {
    if (this.animType === 'baffle') {
      this.animOptions.speed = 50;
      this.animOptions.characters = '█▓░ </>';
      this.animOptions.maxTimeToDecrypt = '4000';
    } else {
      this.animOptions.speed = 'slower'
    }
  }
}
</script>

<style scoped>
.char {
  font-size: 1.5rem;
  font-weight: bold;
}
</style>
