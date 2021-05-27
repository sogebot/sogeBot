import { setLocale } from '@sogebot/ui-helpers/dayjsHelper';
import { getConfiguration, getTranslations } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import VueCompositionAPI from '@vue/composition-api';
import Vue from 'vue';
import LoadScript from 'vue-plugin-load-script';
import VueRouter from 'vue-router';

import { store } from 'src/panel/helpers/store';

import { ButtonStates, states } from '../panel/helpers/buttonStates';
import urlParam from '../panel/helpers/urlParam';

Vue.use(VueRouter);
Vue.use(LoadScript);
Vue.use(VueCompositionAPI);

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

const overlays = async () => {
  await getTranslations();
  store.commit('setConfiguration', await getConfiguration());

  Vue.prototype.translate = (v: string) => translate(v);
  Vue.prototype.urlParam = (v: string) => urlParam(v);
  Vue.prototype.$state = ButtonStates;

  const router = new VueRouter({
    mode:   'history',
    base:   __dirname,
    routes: [
      {
        path: '/overlays/alerts/:id', name: 'alertsRegistryOverlay', component: () => import('./views/alertsRegistry.vue'),
      },
      {
        path: '/overlays/goals/:id', name: 'goalsOverlay', component: () => import('./views/goals.vue'),
      },
      {
        path: '/overlays/text/:id', name: 'textOverlay', component: () => import('./views/text.vue'),
      },
      {
        path: '/overlays/:id', name: '_mapper', component: () => import('./views/_mapper.vue'),
      },
    ],
  });

  new Vue({
    store,
    router,
    created() {
      setLocale(this.$store.state.configuration.lang);
    },
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#overlays');
};

overlays();
