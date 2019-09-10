<template>
  <b-container class="border border-danger center p-5 bg-dark">
    <h5 class="text-light">You need to be logged in to use sogeBot</h5>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component({})
export default class Login extends Vue {
  get url() {
    return window.location.origin;
  }

  mounted() {
    // autorefresh
    window.location.replace('http://oauth.sogebot.xyz/?state=' + this.url);
  }
}
</script>

<style>
  .center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: max-content;
  }
  body {
    background: repeating-linear-gradient(
      -55deg,
      #222,
      #222 10px,
      #333 10px,
      #333 20px
    );
  }
</style>