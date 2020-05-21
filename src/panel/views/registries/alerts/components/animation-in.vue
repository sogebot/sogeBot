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
        <div class="test slow animate__animated" :class="[computedClass]"></div>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';

require('../../../../../../scss/letter-animations.css');
require('animate.css');

@Component({})
export default class AnimationIn extends Vue {
  @PropSync('animation') animType !: string
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
    { value: 'fadeIn', text: 'fadeIn' },
    { value: 'fadeInDown', text: 'fadeInDown' },
    { value: 'fadeInLeft', text: 'fadeInLeft' },
    { value: 'fadeInRight', text: 'fadeInRight' },
    { value: 'fadeInUp', text: 'fadeInUp' },
    { value: 'fadeInDownBig', text: 'fadeInDownBig' },
    { value: 'fadeInLeftBig', text: 'fadeInLeftBig' },
    { value: 'fadeInRightBig', text: 'fadeInRightBig' },
    { value: 'fadeInUpBig', text: 'fadeInUpBig' },
    { value: 'flipInX', text: 'flipInX' },
    { value: 'flipInY', text: 'flipInY' },
    { value: 'backInDown', text: 'backInDown' },
    { value: 'backInLeft', text: 'backInLeft' },
    { value: 'backInRight', text: 'backInRight' },
    { value: 'backInUp', text: 'backInUp' },
    { value: 'bounceIn', text: 'bounceIn' },
    { value: 'bounceInDown', text: 'bounceInDown' },
    { value: 'bounceInLeft', text: 'bounceInLeft' },
    { value: 'bounceInRight', text: 'bounceInRight' },
    { value: 'bounceInUp', text: 'bounceInUp' },
    { value: 'flipInX', text: 'flipInX' },
    { value: 'flipInY', text: 'flipInY' },
    { value: 'lightSpeedIn', text: 'lightSpeedIn' },
    { value: 'rotateIn', text: 'rotateIn' },
    { value: 'rotateInDownLeft', text: 'rotateInDownLeft' },
    { value: 'rotateInDownRight', text: 'rotateInDownRight' },
    { value: 'rotateInUpLeft', text: 'rotateInUpLeft' },
    { value: 'rotateInUpRight', text: 'rotateInUpRight' },
    { value: 'slideInDown', text: 'slideInDown' },
    { value: 'slideInLeft', text: 'slideInLeft' },
    { value: 'slideInRight', text: 'slideInRight' },
    { value: 'slideInUp', text: 'slideInUp' },
    { value: 'zoomIn', text: 'zoomIn' },
    { value: 'zoomInDown', text: 'zoomInDown' },
    { value: 'zoomInLeft', text: 'zoomInLeft' },
    { value: 'zoomInRight', text: 'zoomInRight' },
    { value: 'zoomInUp', text: 'zoomInUp' },
    { value: 'rollIn', text: 'rollIn' },
    { value: 'jackInTheBox', text: 'jackInTheBox' },
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
