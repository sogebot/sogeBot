<template>
  <b-container class="p-0">
    <b-row>
      <b-col>
        <b-input-group>
          <b-button @click="test = true" variant="info" slot="prepend">Test</b-button>
          <b-form-select v-model="animType" :options="options" class="col" plain></b-form-select>
        </b-input-group>
      </b-col>
      <b-col>
        <div class="test animate__animated slow" :class="[computedClass]"></div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';

require('../../../../../../scss/letter-animations.css');
require('animate.css');

@Component({})
export default class AnimationOut extends Vue {
  @PropSync('animation') readonly animType !: string
  test: boolean = false

  get computedClass() {
    if (this.test) {
      setTimeout(() => {
        this.test = false;
      }, 100);
      return '';
    } else {
      return 'animate__' + this.animType;
    }
  }

  options: { value: string, text: string }[] = [
    { value: 'fadeOut', text: 'fadeOut' },
    { value: 'fadeOutDown', text: 'fadeOutDown' },
    { value: 'fadeOutLeft', text: 'fadeOutLeft' },
    { value: 'fadeOutRight', text: 'fadeOutRight' },
    { value: 'fadeOutUp', text: 'fadeOutUp' },
    { value: 'fadeOutDownBig', text: 'fadeOutDownBig' },
    { value: 'fadeOutLeftBig', text: 'fadeOutLeftBig' },
    { value: 'fadeOutRightBig', text: 'fadeOutRightBig' },
    { value: 'fadeOutUpBig', text: 'fadeOutUpBig' },
    { value: 'flipOutX', text: 'flipOutX' },
    { value: 'flipOutY', text: 'flipOutY' },
    { value: 'backOutDown', text: 'backOutDown' },
    { value: 'backOutLeft', text: 'backOutLeft' },
    { value: 'backOutRight', text: 'backOutRight' },
    { value: 'backOutUp', text: 'backOutUp' },
    { value: 'bounceOut', text: 'bounceOut' },
    { value: 'bounceOutDown', text: 'bounceOutDown' },
    { value: 'bounceOutLeft', text: 'bounceOutLeft' },
    { value: 'bounceOutRight', text: 'bounceOutRight' },
    { value: 'bounceOutUp', text: 'bounceOutUp' },
    { value: 'flipOutX', text: 'flipOutX' },
    { value: 'flipOutY', text: 'flipOutY' },
    { value: 'lightSpeedOut', text: 'lightSpeedOut' },
    { value: 'rotateOut', text: 'rotateOut' },
    { value: 'rotateOutDownLeft', text: 'rotateOutDownLeft' },
    { value: 'rotateOutDownRight', text: 'rotateOutDownRight' },
    { value: 'rotateOutUpLeft', text: 'rotateOutUpLeft' },
    { value: 'rotateOutUpRight', text: 'rotateOutUpRight' },
    { value: 'slideOutDown', text: 'slideOutDown' },
    { value: 'slideOutLeft', text: 'slideOutLeft' },
    { value: 'slideOutRight', text: 'slideOutRight' },
    { value: 'slideOutUp', text: 'slideOutUp' },
    { value: 'zoomOut', text: 'zoomOut' },
    { value: 'zoomOutDown', text: 'zoomOutDown' },
    { value: 'zoomOutLeft', text: 'zoomOutLeft' },
    { value: 'zoomOutRight', text: 'zoomOutRight' },
    { value: 'zoomOutUp', text: 'zoomOutUp' },
    { value: 'rollOut', text: 'rollOut' },
  ]
}
</script>

<style scoped>
.test {
  background-color: gray;
  -webkit-box-shadow: 0px 0px 10px 10px rgba(0,0,0,0.7);
  -moz-box-shadow: 0px 0px 10px 10px rgba(0,0,0,0.7);
  box-shadow: 0px 0px 10px 10px rgba(0,0,0,0.7);
  height: 30px; width: 40px;
  position: relative;
  top: 3px;
}
</style>
