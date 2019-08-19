<template>
  <b-card-group deck>
    <b-card @click="layout_number = '1'">
      <b-card-text class="text-center m-0">
        <img src="https://via.placeholder.com/50x50.png?text=Placeholder+Image"/>
      </b-card-text>
      <b-card-text class="text-center text pb-3">Placeholder text</b-card-text>
      <div slot="footer" :class="{'bg-success': layout_number === '1'}"></div>
    </b-card>

    <b-card @click="layout_number = '2'">
      <b-card-text class="text-center m-0" style="position: relative;top: 0.6rem;">
        <img src="https://via.placeholder.com/50x50.png?text=Placeholder+Image"/>
      </b-card-text>
      <b-card-text class="text-center text" style="position: absolute;top: 36%;left: 50%;transform: translate(-50%, -50%);">Placeholder text</b-card-text>
      <div slot="footer" :class="{'bg-success': layout_number === '2'}"></div>
    </b-card>

    <b-card @click="layout_number = '3'">
      <b-card-text class="text-center">
        <b-row no-gutters style="position: relative;top: 0.6rem;">
          <b-col class="ml-3" md="auto">
            <img src="https://via.placeholder.com/50x50.png?text=Placeholder+Image"/>
          </b-col>
          <b-col class="text-left text ml-2" style="position: relative;top: 0.8rem;">
            Placeholder text
          </b-col>
        </b-row>
      </b-card-text>
      <div slot="footer" :class="{'bg-success': layout_number === '3'}"></div>
    </b-card>
  </b-card-group>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';

@Component({})
export default class AlertsEditFollowForm extends Vue {
  @PropSync('layout') readonly layout_number !: number
}
</script>

<style scoped>
  .card-body {
    padding: 0 !important;
    padding-top: 1rem !important;
  }
  .card-footer {
    padding: 0;
  }
  .card-footer * {
    padding: 1rem 0;
  }
  .text {
    text-shadow: 0 0 2px #000;

  }
</style>