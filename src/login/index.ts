import Vue from 'vue';

import translate from '../panel/helpers/translate';
import LoadScript from 'vue-plugin-load-script';
import VueRouter from 'vue-router';

import { ButtonStates, states } from '../panel/helpers/buttonStates';

import BootstrapVue from 'bootstrap-vue';

import urlParam from '../panel/helpers/urlParam';

import { library } from '@fortawesome/fontawesome-svg-core';

import {
  faCheckCircle, faSkullCrossbones,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
library.add(faCheckCircle, faSkullCrossbones);
Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(VueRouter);
Vue.use(LoadScript);
Vue.use(BootstrapVue);

export interface Global {
  translations: any;
  configuration: any;
  $loadScript: (script: string) => Promise<void>;
  $unloadScript: (script: string) => Promise<void>;
}

declare module 'vue/types/vue' {
  interface Vue {
    urlParam(key: string): string | null;
    $state: states;
  }
}

const init = async () => {
  Vue.prototype.translate = (v: string) => translate(v);
  Vue.prototype.urlParam = (v: string) => urlParam(v);
  Vue.prototype.$state = ButtonStates;

  const router = new VueRouter({
    mode: 'history',
    base: __dirname,
    routes: [
      { path: '/login', name: 'login', component: () => import('./views/login.vue') },
    ],
  });

  new Vue({
    router,
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#login');
};

init();
