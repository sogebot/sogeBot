import VueCompositionAPI from '@vue/composition-api';
import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);
Vue.use(VueCompositionAPI);

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
