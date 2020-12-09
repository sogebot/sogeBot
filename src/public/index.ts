import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCaretLeft,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import VueCompositionAPI from '@vue/composition-api';
import BootstrapVue from 'bootstrap-vue';
import Vue from 'vue';
import VueRouter from 'vue-router';

import { setLocale } from 'src/bot/helpers/dayjs';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { setMainLoaded } from 'src/panel/helpers/isAvailableVariable';
import { isUserLoggedIn } from 'src/panel/helpers/isUserLoggedIn';
import { getConfiguration, getTranslations } from 'src/panel/helpers/socket';
import { store } from 'src/panel/helpers/store';

Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(BootstrapVue);
Vue.use(VueCompositionAPI);

/* import widely used components */
Vue.component('panel', () => import('src/panel/components/panel.vue'));
Vue.component('button-with-icon', () => import('src/panel/components/button.vue'));

library.add(faCaretLeft);

export interface Global {
  configuration: any;
  isMainLoaded?: boolean;
}

Vue.use(VueRouter);

const main = async () => {
  await getTranslations();
  store.commit('setLoggedUser', await isUserLoggedIn(false, false));
  store.commit('setConfiguration', await getConfiguration());

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
    store,
    router,
    components: {
      navbar: () => import('./components/navbar/navbar.vue'),
      twitch: () => import('./components/twitch.vue'),
    },
    created() {
      setLocale(this.$store.state.configuration.lang);
    },
    template: `
      <div id="app">
        <navbar/>
        <twitch/>
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#app');
};

main();
