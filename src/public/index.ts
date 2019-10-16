import 'moment/min/locales.min';

import BootstrapVue from 'bootstrap-vue';

import Vue from 'vue';
import VueRouter from 'vue-router';

import moment from 'moment';
import momentTimezone from 'moment-timezone';
import VueMoment from 'vue-moment';

import translate from 'src/panel/helpers/translate';
import { ButtonStates, states } from 'src/panel/helpers/buttonStates';
import { setMainLoaded } from 'src/panel/helpers/isAvailableVariable';
import { getListOf } from 'src/panel/helpers/getListOf';
import { getConfiguration, getTranslations } from 'src/panel/helpers/socket';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(BootstrapVue);

Vue.use(VueMoment, {
  moment, momentTimezone,
});

/* import widely used components */
Vue.component('panel', () => import('src/panel/components/panel.vue'));
Vue.component('button-with-icon', () => import('src/panel/components/button.vue'));

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCaretLeft,
} from '@fortawesome/free-solid-svg-icons';
library.add(faCaretLeft);

export interface Global {
  configuration: any;
  isMainLoaded?: boolean;
}

declare module 'vue/types/vue' {
  interface Vue {
    configuration: any;
    $moment?: any;
    $loadScript: (script: string) => Promise<void>;
    $unloadScript: (script: string) => Promise<void>;
    $state: states;
    urlParam(key: string): string | null;
    translate(id: string): string;
    $loggedUser: any | null;
    $systems: {
      name: string;
      enabled: boolean;
      areDependenciesEnabled: boolean;
      isDisabledByEnv: boolean;
    }[];
    $core: {
      name: string;
      enabled: boolean;
      areDependenciesEnabled: boolean;
      isDisabledByEnv: boolean;
    }[];
    $integrations: {
      name: string;
      enabled: boolean;
      areDependenciesEnabled: boolean;
      isDisabledByEnv: boolean;
    }[];
  }
}

Vue.use(VueRouter);

const main = async () => {
  // init prototypes
  Vue.prototype.translate = (v) => translate(v);

  await getTranslations();
  Vue.prototype.configuration = await getConfiguration();

  Vue.prototype.$core = await getListOf('core');
  Vue.prototype.$systems = await getListOf('systems');
  Vue.prototype.$integrations = await getListOf('integrations');

  Vue.prototype.$state = ButtonStates;

  setMainLoaded();

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/', name: 'Dashboard', component: () => import('./views/dashboard.vue') },
      { path: '/playlist', name: 'Playlist', component: () => import('./views/playlist.vue') },
      { path: '/songrequests', name: 'SongRequests', component: () => import('./views/songrequests.vue') },
      { path: '/quotes', name: 'Quotes', component: () => import('./views/quotes.vue') },
    ],
  });

  new Vue({
    router,
    created() {
      this.$moment.locale(Vue.prototype.configuration.lang); // set proper moment locale
    },
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#app');
};

main();
