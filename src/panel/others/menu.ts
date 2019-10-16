import Vue from 'vue';
import Component from './menu.vue';
import { isMainLoaded } from '../helpers/isAvailableVariable';

export const init = async () => {
  await Promise.all([
    isMainLoaded(),
  ]);

  new Vue({
    el: '#menu',
    render: function (createElement) {
      return createElement(Component);
    },
  });
};

init();
