/* globals token commons systems */
import Vue from 'vue';
import User from './user.vue';

import { isAvailableVariable, isMainLoaded } from '../helpers/isAvailableVariable';

async function initUser () {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
    isMainLoaded(),
  ]);

  new Vue({ // eslint-disable-line no-new
    el: '#user',
    data: {
      items: [],
    },
    render: function (createElement) {
      if (typeof systems !== 'undefined') {
        return createElement(User, { props: { commons, token, systems } });
      } else {
        return false;
      }
    },
  });
}

initUser();
