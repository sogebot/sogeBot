<template>
  <b-card-group deck>
    <b-card :class="{'bg-secondary': layout_number === '1'}" @click="layout_number = '1'"
            :img-src="layout1">
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '2'}" @click="layout_number = '2'"
            :img-src="layout2">
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '3'}" @click="layout_number = '3'"
            :img-src="layout3">
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '4'}" @click="layout_number = '4'"
            :img-src="layout4">
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '5'}" @click="layout_number = '5'"
            :img-src="layout5">
    </b-card>
  </b-card-group>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';

import layout1 from '../media/layout1.png'
import layout2 from '../media/layout2.png'
import layout3 from '../media/layout3.png'
import layout4 from '../media/layout4.png'
import layout5 from '../media/layout5.png'

@Component({})
export default class AlertsEditFollowForm extends Vue {
  @PropSync('layout') readonly layout_number !: number

  layout1 = layout1;
  layout2 = layout2;
  layout3 = layout3;
  layout4 = layout4;
  layout5 = layout5;
}
</script>

<style scoped>
  .card-body {
    padding: 0 !important;
    cursor: pointer;
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently
                          supported by Chrome and Opera */
  }
  .card-footer {
    padding: 0;
  }
  .card-footer * {
    padding: 1rem 0;
  }
  .text {
    color: white;
    text-shadow: 0 0 2px #000, 0 0 3px #000, 0 0 4px #000, 0 0 5px #000;
    font-variant: small-caps;

  }
</style>