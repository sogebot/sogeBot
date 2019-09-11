<template>
  <b-container class="center p-5 text-center">
    <h4 class="text-danger" v-if="error === 'must+be+caster'">
      <fa icon="skull-crossbones" fixed-width size="4x"/>
      <div>Insufficient permission.</div>
    </h4>
    <h4 class="text-success" v-if="error === 'logged+out'">
      <fa icon="check-circle" fixed-width size="4x"/>
      <div>You have successfully logged out.</div>
      <b-btn variant="success" class="mt-3" @click="login">Login</b-btn>
    </h4>
    <h4 class="text-danger" v-if="error === 'popout+must+be+logged'">
      <fa icon="skull-crossbones" fixed-width size="4x"/>
      <div>Cannot access without login.</div>
      <b-btn variant="secondary" class="mt-3" @click="goBack">Try again</b-btn>
    </h4>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component({})
export default class Login extends Vue {
  error: null | string = null;
  popoutUrl: null | string = null;

  get url() {
    return window.location.origin;
  }

  goBack() {
    if (this.popoutUrl) {
      window.location.replace(this.popoutUrl)
    }
  }

  login() {
    window.location.replace('http://oauth.sogebot.xyz/?state=' + encodeURIComponent(window.btoa(this.url)))
  }

  mounted() {
    const hash = window.location.hash
    if (hash.trim().length > 0) {
      const error = hash.match(/error=[a-zA-Z0-9+]*/)
      if (error) {
        this.error = error[0].split('=')[1];
      }
      const url = hash.match(/url=[a-zA-Z0-9+:\/#]*/)
      if (url) {
        this.popoutUrl = url[0].split('=')[1];
      }
    } else {
      // autorefresh
      this.login();
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
</style>