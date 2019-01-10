/* globals translations token */

import './others/checklist';
import './widgets/dashboard';
import './widgets/popout';

import Vue from 'vue';
import VueRouter from 'vue-router';

import * as _ from 'lodash';

import isAvailableVariable from './helpers/isAvailableVariable';
import translate from './helpers/translate';
import urlParam from './helpers/urlParam';

export interface Global {
  translations: any;
  configuration: any;
}

declare var global: Global;
declare var token: string;

declare module 'vue/types/vue' {
  interface Vue {
    token: string;
    configuration: any;
    $moment?: any;
    _: _.LoDashStatic;
    urlParam(key: string): string | null;
    translate(id: string): string;
  }
}

Vue.use(VueRouter);

const main = async () => {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
  ]);

  // init prototypes
  Vue.prototype.translate = (v) => translate(v);
  Vue.prototype.urlParam = (v) => urlParam(v);
  Vue.prototype.token = token;
  Vue.prototype.configuration = global.configuration;
  Vue.prototype._ = _;

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/manage/polls', name: 'PollsManager', component: () => import('./views/managers/polls.vue') },
      { path: '/registry/goals/list', name: 'GoalsRegistryList', component: () => import('./views/registries/goalsList.vue') },
      { path: '/registry/goals/edit/:id?', name: 'GoalsRegistryEdit', component: () => import('./views/registries/goalsEdit.vue') },
    ],
  });

  new Vue({
    router,
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#pages');
};

main();
