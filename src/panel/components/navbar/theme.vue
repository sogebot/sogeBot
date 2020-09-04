<template>
  <b-btn @click="toggleTheme" class="border-0 ml-1 p-1 pl-2 pr-2" variant="null">
    <fa icon="sun" fixed-width style="color: rgb(253, 177, 0)" v-if="theme === 'light'"/>
    <fa icon="moon" fixed-width style="color: #d0d5d2" v-else/>
  </b-btn>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from '@vue/composition-api'
import { get } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
library.add(faSun, faMoon);

export default defineComponent({
  setup(props, context) {
    const theme = ref('light');

    const toggleTheme = () => {
      const theme = localStorage.getItem('theme');
      if (theme === null || theme === 'light') {
        localStorage.setItem('theme', 'dark')
      }
      if (theme === 'dark') {
        localStorage.setItem('theme', 'light');
      }
      loadTheme(localStorage.getItem('theme') || 'dark');
    }

    const loadTheme = (themeArg: string) => {
      const head = document.getElementsByTagName('head')[0];
      const link = (document.createElement('link') as any);
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href',`/dist/css/${themeArg}.css`);
      head.appendChild(link);
      theme.value = themeArg;
    }

    onMounted(() => {
      const theme = localStorage.getItem('theme');
      loadTheme(theme || get(context.root.$store.state.configuration, 'core.ui.theme', 'light'));
    })
    return { theme, toggleTheme };
  }
});
</script>