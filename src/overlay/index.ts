import Vue from 'vue';

import translate from '../panel/helpers/translate';
import LoadScript from 'vue-plugin-load-script';
import VueRouter from 'vue-router';
import BootstrapVue from 'bootstrap-vue';

import { ButtonStates, states } from '../panel/helpers/buttonStates';

import moment from 'moment';
import momentTimezone from 'moment-timezone';
import VueMoment from 'vue-moment';
import urlParam from '../panel/helpers/urlParam';
import { getConfiguration, getTranslations } from 'src/panel/helpers/socket';

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

declare module 'vue/types/vue' {
  interface Vue {
    configuration: any;
    urlParam(key: string): string | null;
    $state: states;
  }
}

const overlays = async () => {
  await getTranslations();
  Vue.prototype.configuration = await getConfiguration();

  Vue.prototype.translate = (v: string) => translate(v);
  Vue.prototype.urlParam = (v: string) => urlParam(v);
  Vue.prototype.$state = ButtonStates;

  const router = new VueRouter({
    mode: 'history',
    base: __dirname,
    routes: [
      { path: '/overlays/alerts', name: 'alertsOverlay', component: () => import('./views/alerts.vue') },
      { path: '/overlays/alerts/:id', name: 'alertsRegistryOverlay', component: () => import('./views/alertsRegistry.vue') },
      { path: '/overlays/bets', name: 'betsOverlay', component: () => import('./views/bets.vue') },
      { path: '/overlays/carousel', name: 'carouselOverlay', component: () => import('./views/carousel.vue') },
      { path: '/overlays/clips', name: 'clipsOverlay', component: () => import('./views/clips.vue') },
      { path: '/overlays/clipscarousel', name: 'clipsCarouselOverlay', component: () => import('./views/clipscarousel.vue') },
      { path: '/overlays/credits', name: 'creditsOverlay', component: () => import('./views/credits.vue') },
      { path: '/overlays/emotes', name: 'emotesOverlay', component: () => import('./views/emotes.vue') },
      { path: '/overlays/eventlist', name: 'eventlistOverlay', component: () => import('./views/eventlist.vue') },
      { path: '/overlays/goals/:id', name: 'goalsOverlay', component: () => import('./views/goals.vue') },
      { path: '/overlays/polls', name: 'pollsOverlay', component: () => import('./views/polls.vue') },
      { path: '/overlays/randomizer', name: 'randomizerOverlay', component: () => import('./views/randomizer.vue') },
      { path: '/overlays/stats', name: 'statsOverlay', component: () => import('./views/stats.vue') },
      { path: '/overlays/text', name: 'textOverlay', component: () => import('./views/text.vue') },
      { path: '/overlays/tts', name: 'ttsOverlay', component: () => import('./views/tts.vue') },
    ],
  });

  new Vue({
    router,
    created() {
      this.$moment.locale(this.configuration.lang); // set proper moment locale
    },
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#overlays');
};

overlays();
