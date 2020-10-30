<template lang="pug">
  div.navbar.navbar-light.bg-light.fixed-top
    vue-headful(:title='name.toUpperCase() + " " + version')
    header.w-100
      b-row.flex-nowrap.justify-content-between.align-items-center
        b-col.text-left
          a(href="#/" style="line-height: 36px;").blog-header-logo.text-dark
            strong.text-uppercase {{ name }}
              span.d-none.d-sm-inline.pl-2 {{ version }}
        b-col.d-flex.justify-content-end.align-items-center
          checklist
          theme
          user

          b-dropdown(variant="light" toggle-class="text-decoration-none" no-caret)
            template(v-slot:button-content)
              fa(icon="bars")
            b-dropdown-item(@click="joinBot()" variant="success")
              fa(icon="sign-in-alt").mr-2
              | {{ translate('join-channel') }}
            b-dropdown-item(@click="leaveBot()" variant="danger")
              fa(icon="sign-out-alt").mr-2
              | {{ translate('leave-channel') }}
    navmenu
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from '@vue/composition-api'
import { getSocket } from 'src/panel/helpers/socket';
import translate from 'src/panel/helpers/translate';

import Vue from 'vue';
import vueHeadful from 'vue-headful';
Vue.component('vue-headful', vueHeadful);

import { library } from '@fortawesome/fontawesome-svg-core';
import { faBars, faSignInAlt, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
library.add(faBars, faSignInAlt, faSignOutAlt);

const socket = getSocket('/');

export default defineComponent({
  components: {
    checklist: () => import('./checklist.vue'),
    user: () => import('./user.vue'),
    navmenu: () => import('./menu.vue'),
    theme: () => import('./theme.vue'),
  },
  setup() {
    const name = ref('');
    const version = ref('');

    onMounted(() => {
      socket.emit('version', (recvVersion: string) => version.value = recvVersion);
      socket.emit('name', (recvName: string) => name.value = recvName );
    })

    const joinBot = () => socket.emit('joinBot');
    const leaveBot = () => socket.emit('leaveBot');

    return { name, version, joinBot, leaveBot, translate, }
  }
});
</script>