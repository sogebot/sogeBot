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
              | join channel
            b-dropdown-item(@click="leaveBot()" variant="danger")
              fa(icon="sign-out-alt").mr-2
              | leave from channel
    navmenu
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import vueHeadful from 'vue-headful';
Vue.component('vue-headful', vueHeadful);

import { library } from '@fortawesome/fontawesome-svg-core';
import { faBars, faSignInAlt, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
library.add(faBars, faSignInAlt, faSignOutAlt);

@Component({
  components: {
    checklist: () => import('./checklist.vue'),
    user: () => import('./user.vue'),
    navmenu: () => import('./menu.vue'),
    theme: () => import('./theme.vue'),
  },
})
export default class navbar extends Vue {
  socket = getSocket('/');

  name: string = '';
  version: string = '';

  mounted() {
    this.socket.emit('version', (version: string) => this.version = version);
    this.socket.emit('name', (name: string) => this.name = name );
  }

  joinBot() {
    this.socket.emit('joinBot');
  }

  leaveBot() {
    this.socket.emit('leaveBot');
  }
}
</script>