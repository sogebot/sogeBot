/* globals translations token */

import './others/checklist';
import './widgets/dashboard';
import './widgets/popout';

import Vue from 'vue';
import VueRouter from 'vue-router';

import * as _ from 'lodash';

import isAvailableVariable from './helpers/isAvailableVariable';
import translate from './helpers/translate';

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
  Vue.prototype.token = token;
  Vue.prototype.configuration = global.configuration;
  Vue.prototype._ = _;

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/manage/polls', name: 'PollsManager', component: () => import('./views/managers/polls.vue') },
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
