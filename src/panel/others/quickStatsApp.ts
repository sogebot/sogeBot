import Vue from 'vue';
import Component from './quickStatsApp.vue';
import { isMainLoaded } from '../helpers/isAvailableVariable';

export const init = async () => {
  await Promise.all([
    isMainLoaded(),
  ]);

  new Vue({
    el: '#quickStatsApp',
    render: function (createElement) {
      return createElement(Component);
    },
  });
};

init();
