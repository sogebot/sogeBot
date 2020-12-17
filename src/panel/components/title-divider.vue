<template>
  <b-row no-gutters>
      <b-col class="pt-1">
        <hr class="border-secondary">
      </b-col>
      <b-col cols="auto">
        <h6 class="text-muted mb-0"><slot></slot></h6>
      </b-col>
      <b-col class="pt-1">
        <hr class="border-secondary">
      </b-col>
    </b-row>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component({})
export default class textInput extends Vue {}
</script>

