import Vue from 'vue';
import Component from './menu.vue';
import { isAvailableVariable, isMainLoaded } from '../helpers/isAvailableVariable';

export const init = async () => {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
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
