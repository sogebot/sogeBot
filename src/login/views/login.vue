<template>
  <b-container class="border border-danger center p-5 bg-dark">
    <h3 class="text-danger" v-if="error === 'must+be+caster'">
      User must be caster to have access to dashboard
    </h3>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component({})
export default class Login extends Vue {
  error: null | string = null;

  get url() {
    return window.location.origin;
  }

  mounted() {
    const hash = window.location.hash
    if (hash.trim().length > 0) {
      const error = hash.match(/error=[a-zA-Z0-9+]*/)
      if (error) {
        this.error = error[0].split('=')[1];
      }
    } else {
      // autorefresh
      window.location.replace('http://oauth.sogebot.xyz/?state=' + this.url);
    }
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
  h3 {
    font-weight: bold;
    text-transform: uppercase;
  }
</style>