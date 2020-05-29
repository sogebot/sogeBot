<template lang="pug">
  div.navbar.navbar-light.bg-light.fixed-top
    header.w-100
      b-row.flex-nowrap.justify-content-between.align-items-center
        b-col.d-flex.justify-content-end.align-items-center
          theme
          user
    navmenu
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

// @ts-ignore - no types for vue-headful
import vueHeadful from 'vue-headful';
Vue.component('vue-headful', vueHeadful);

import { library } from '@fortawesome/fontawesome-svg-core';
import { faBars, faSignInAlt, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
library.add(faBars, faSignInAlt, faSignOutAlt);

@Component({
  components: {
    user: () => import('src/panel/components/navbar/user.vue'),
    navmenu: () => import('./menu.vue'),
    theme: () => import('src/panel/components/navbar/theme.vue'),
  },
})
export default class navbar extends Vue {
  socket = getSocket('/', true);
}
</script>