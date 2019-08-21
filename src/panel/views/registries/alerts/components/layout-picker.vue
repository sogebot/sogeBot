<template>
  <b-card-group deck>
    <b-card :class="{'bg-secondary': layout_number === '1'}" @click="layout_number = '1'">
      <b-card-text class="text-center m-0">
        <fa icon="image" size="4x" class="text-muted"/>
      </b-card-text>
      <b-card-text class="text-center text pb-1">text</b-card-text>
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '2'}" @click="layout_number = '2'">
      <b-card-text class="text-center text mb-0">text</b-card-text>
      <b-card-text class="text-center m-0">
        <fa icon="image" size="4x" class="text-muted"/>
      </b-card-text>
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '3'}" @click="layout_number = '3'">
      <b-card-text class="text-center m-0" style="position: relative;top: 1rem;">
        <fa icon="image" size="4x" class="text-muted"/>
      </b-card-text>
      <b-card-text class="text-center text" style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);">text</b-card-text>
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '4'}" @click="layout_number = '4'">
      <b-card-text class="text-center">
        <b-row no-gutters style="position: relative;top: 0.9rem;">
          <b-col class="ml-3" md="auto">
            <fa icon="image" size="4x" class="text-muted"/>
          </b-col>
          <b-col class="text-left text ml-2" style="position: relative;top: 1.2rem;">
            text
          </b-col>
        </b-row>
      </b-card-text>
    </b-card>

    <b-card :class="{'bg-secondary': layout_number === '5'}" @click="layout_number = '5'">
      <b-card-text class="text-center">
        <b-row no-gutters style="position: relative;top: 0.9rem;">
          <b-col class="text-right text mr-2" style="position: relative;top: 1.2rem;">
            text
          </b-col>
          <b-col class="mr-3" md="auto">
            <fa icon="image" size="4x" class="text-muted"/>
          </b-col>
        </b-row>
      </b-card-text>
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