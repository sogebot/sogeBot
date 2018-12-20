/* globals translations commons socket */

import './others/checklist';
import './widgets/dashboard';
import './widgets/popout';

import Vue from 'vue';
import VueRouter from 'vue-router';

import * as _ from 'lodash';

import translate from './helpers/translate';

export interface Global {
  translations: any;
}

declare var global: Global;

Vue.use(VueRouter);
Vue.prototype.translate = (v) => translate(v);

const isAvailableVariable = async (variable) => {
  return new Promise((resolve, reject) => {
    const check = async (r) => {
      if (typeof global[variable] === 'undefined' || _.size(global[variable]) === 0) {
        setTimeout(() => {
          check(r);
        }, 10);
      } else {
        r();
      }
    };
    check(resolve);
  });
};

const main = async () => {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('socket'),
    isAvailableVariable('commons'),
  ]);

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/manage/votes', component: () => import('./views/managers/votes.vue') },
    ],
  });

  new Vue({
    router,
    template: `
      <div id="app">
        <router-view class="view" :commons="commons"></router-view>
      </div>
    `,
  }).$mount('#pages');
};

main();
