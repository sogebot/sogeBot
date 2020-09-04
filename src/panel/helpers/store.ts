import Vuex from 'vuex';
import Vue from 'vue';
Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    loggedUser: null,
  },
  mutations: {
    setLoggedUser (state, user) {
      state.loggedUser = user;
    },
  },
});

export {store};