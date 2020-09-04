import Vuex from 'vuex';
import Vue from 'vue';
Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    loggedUser: null,
    configuration: null,
  },
  mutations: {
    setLoggedUser (state, user) {
      Vue.set(state, 'loggedUser', user);
    },
    setConfiguration (state, configuration) {
      Vue.set(state, 'configuration', configuration);
    },
  },
});

export {store};