import Vue from 'vue';
import Component from './quickStatsApp.vue';
import { isAvailableVariable, isMainLoaded } from '../helpers/isAvailableVariable';

export const init = async () => {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
    isMainLoaded(),
  ]);

  new Vue({
    el: '#quickStatsApp',
    render: function (createElement) {
      return createElement(Component);
    }
  });
};

init();
