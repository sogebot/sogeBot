<template>
  <b-btn @click="toggleTheme" class="border-0 ml-1 p-1 pl-2 pr-2" variant="null">
    <fa icon="sun" fixed-width style="color: rgb(253, 177, 0)" v-if="theme === 'light'"/>
    <fa icon="moon" fixed-width style="color: #d0d5d2" v-else/>
  </b-btn>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { get } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
library.add(faSun, faMoon);

@Component({})
export default class User extends Vue {
  theme: string = 'light';

  async mounted() {
    const theme = localStorage.getItem('theme');
    this.loadTheme(theme || get(Vue, 'prototype.configuration.core.ui.theme', 'light'));

  }

  toggleTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === null || theme === 'light') {
      localStorage.setItem('theme', 'dark')
    }
    if (theme === 'dark') {
      localStorage.setItem('theme', 'light');
    }
    this.loadTheme(localStorage.getItem('theme') || 'dark');
  }

  loadTheme(theme: string) {
    const head = document.getElementsByTagName('head')[0];
    const link = (document.createElement('link') as any);
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href',`/dist/css/${theme}.css`);
    head.appendChild(link);
    this.theme = theme;
  }
}
</script>