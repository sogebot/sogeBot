/* globals commons _ translations configuration systems */
import Vue from 'vue'
import Component from './checklist.vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
Vue.component('fa', FontAwesomeIcon);

import { isMainLoaded } from '../helpers/isAvailableVariable';

export const init = async () => {
  await Promise.all([
    isMainLoaded(),
  ]);

  new Vue({
    el: '#checklist',
    render: function (createElement) {
      return createElement(Component);
    },
  });
};

init();