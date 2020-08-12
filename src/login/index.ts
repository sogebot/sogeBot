import Vue from 'vue';
import VueRouter from 'vue-router';
import { library } from '@fortawesome/fontawesome-svg-core';

import { faCheckCircle } from '@fortawesome/free-solid-svg-icons/faCheckCircle';
import { faSkullCrossbones } from '@fortawesome/free-solid-svg-icons/faSkullCrossbones';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(faCheckCircle, faSkullCrossbones);

Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);
Vue.use(VueRouter);

const init = async () => {
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
