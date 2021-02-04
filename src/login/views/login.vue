<template>
  <b-container class="center p-5 text-center">
    <h4 class="text-danger" v-if="error === 'must+be+caster'">
    <svg width="7em" height="7em" viewBox="0 0 16 16" class="bi bi-x-circle" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path fill-rule="evenodd" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
    </svg>
    <div>Insufficient permission.</div>
      <b-btn block variant="success" class="mt-3" @click="login">Login</b-btn>
      <b-btn block variant="primary" @click="publicPage">Public page</b-btn>
    </h4>
    <h4 class="text-success" v-if="error === 'logged+out'">
      <svg width="7em" height="7em" viewBox="0 0 16 16" class="bi bi-check2-circle" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L8 9.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
        <path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1 0 13.5 8a.5.5 0 0 1 1 0 6.5 6.5 0 1 1-3.25-5.63.5.5 0 1 1-.5.865A5.472 5.472 0 0 0 8 2.5z"/>
      </svg>
      <div>You have successfully logged out.</div>
      <b-btn block variant="success" class="mt-3" @click="login">Login</b-btn>
      <b-btn block variant="primary" :href="url + '/public/'">Public page</b-btn>
    </h4>
    <h4 class="text-danger" v-if="error === 'popout+must+be+logged'">
    <svg width="7em" height="7em" viewBox="0 0 16 16" class="bi bi-x-circle" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path fill-rule="evenodd" d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
    </svg>
    <div>Cannot access without login.</div>
      <b-btn block variant="success" class="mt-3" @click="login">Login</b-btn>
      <b-btn block variant="secondary" @click="tryAgain">Try again</b-btn>
    </h4>
  </b-container>
</template>

<script lang="ts">
import {
  computed, defineComponent, onMounted, 
} from '@vue/composition-api';
import { BContainer } from 'bootstrap-vue';
import { BButton } from 'bootstrap-vue';

export default defineComponent({
  components: {
    'b-container': BContainer,
    'b-btn':       BButton,
  },
  setup() {
    const error = computed(() => {
      const hash = window.location.hash;
      if (hash.trim().length > 0) {
        const errorFromHash = hash.match(/error=[a-zA-Z0-9+]*/);
        if (errorFromHash) {
          return errorFromHash[0].split('=')[1];
        }
      }
      return null;
    });
    const url = computed(() => window.location.origin);
    const publicPage = () => {
      window.location.assign(url.value + '/public/');
    };
    const tryAgain =  () => {
      const gotoAfterLogin = sessionStorage.getItem('goto-after-login');
      if (gotoAfterLogin) {
        window.location.assign(gotoAfterLogin);
      } else {
        // go back history
        window.history.back();
      }
    };
    const login = () => {
      window.location.assign('http://oauth.sogebot.xyz/?state=' + encodeURIComponent(window.btoa(
        JSON.stringify({
          url:      url.value,
          referrer: document.referrer,
        }),
      )));
    };
    onMounted(() => {
      const hash = window.location.hash;
      if (hash.trim().length === 0) {
        // autorefresh
        login();
      }
    });
    return {
      error, url, login, publicPage, tryAgain, 
    };
  },
});
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