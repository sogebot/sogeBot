import Vue from 'vue';
import Vuex from 'vuex';
Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    loggedUser: null,
    configuration: null,
    currentGame: '',
    currentTitle: '',
    currentTags: [],
  },
  mutations: {
    setLoggedUser (state, user) {
      Vue.set(state, 'loggedUser', user);
    },
    setConfiguration (state, configuration) {
      Vue.set(state, 'configuration', configuration);
    },
    setCurrentGame (state, currentGame) {
      Vue.set(state, 'currentGame', currentGame);
    },
    setCurrentTitle (state, currentTitle) {
      Vue.set(state, 'currentTitle', currentTitle);
    },
    setCurrentTags (state, currentTags) {
      Vue.set(state, 'currentTags', currentTags);
    },
  },
});

export {store};