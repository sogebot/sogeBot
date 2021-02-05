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
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faBars, faSignInAlt, faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import { defineComponent } from '@vue/composition-api';
import Vue from 'vue';
import vueHeadful from 'vue-headful';

Vue.component('vue-headful', vueHeadful);
library.add(faBars, faSignInAlt, faSignOutAlt);

export default defineComponent({
  components: {
    user:    () => import('src/panel/components/navbar/user.vue'),
    navmenu: () => import('./menu.vue'),
    theme:   () => import('src/panel/components/navbar/theme.vue'),
  },
});
</script>