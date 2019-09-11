import Vue from 'vue';

import { isAvailableVariable } from '../panel/helpers/isAvailableVariable';
import translate from '../panel/helpers/translate';
import LoadScript from 'vue-plugin-load-script';
import VueRouter from 'vue-router';

import { ButtonStates, states } from '../panel/helpers/buttonStates';

import BootstrapVue from 'bootstrap-vue';

import moment from 'moment';
import momentTimezone from 'moment-timezone';
import VueMoment from 'vue-moment';
import urlParam from '../panel/helpers/urlParam';

import { library } from '@fortawesome/fontawesome-svg-core';

import {
  faCheckCircle, faSkullCrossbones,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
library.add(faCheckCircle, faSkullCrossbones);
Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(VueMoment, {
  moment, momentTimezone,
});
Vue.use(VueRouter);
Vue.use(LoadScript);
Vue.use(BootstrapVue);

export interface Global {
  translations: any;
  configuration: any;
  $loadScript: (script: string) => Promise<void>;
  $unloadScript: (script: string) => Promise<void>;
}

declare let global: Global;
declare let token: string;

declare module 'vue/types/vue' {
  interface Vue {
    token: string;
    configuration: any;
    $moment?: any;
    urlParam(key: string): string | null;
    $state: states;
  }
}

const overlays = async () => {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
  ]);

  Vue.prototype.translate = (v) => translate(v);
  Vue.prototype.urlParam = (v) => urlParam(v);
  Vue.prototype.token = token;
  Vue.prototype.configuration = global.configuration;
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
    created() {
      this.$moment.locale(global.configuration.lang); // set proper moment locale
    },
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#login');
};

overlays();
