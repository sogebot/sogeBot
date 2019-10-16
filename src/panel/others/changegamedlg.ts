import Vue from 'vue';
import Component from './changegamedlg.vue';
import { isMainLoaded } from '../helpers/isAvailableVariable';

export const init = async () => {
  await Promise.all([
    isMainLoaded(),
  ]);

  new Vue({
    el: '#changegamedlg',
    render: function (createElement) {
      return createElement(Component);
    },
  });
};

init();
