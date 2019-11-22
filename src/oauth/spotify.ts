import Vue from 'vue';
import VueCompositionApi from '@vue/composition-api';
import App from './spotify.vue';

Vue.use(VueCompositionApi);


const init = async () => {
  new Vue({
    render: h => h(App),
  }).$mount('#app');
};

init();