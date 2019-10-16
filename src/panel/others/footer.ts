import Vue from 'vue';
import Component from './footer.vue';
import { isMainLoaded } from '../helpers/isAvailableVariable';

export const init = async () => {
  await Promise.all([
    isMainLoaded(),
  ]);

  new Vue({
    el: '#footer',
    render: function (createElement) {
      return createElement(Component);
    },
  });
};

init();
