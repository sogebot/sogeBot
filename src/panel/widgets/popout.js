/* globals  commons _ translations configuration socket page */
import Vue from 'vue';
import Popout from './popout.vue';
import { isMainLoaded } from '../helpers/isAvailableVariable';
import { getSocket } from 'src/panel/helpers/socket';

async function initPopout () {
  await Promise.all([
    isMainLoaded(),
  ]);

  new Vue({ // eslint-disable-line no-new
    el: '#popout',
    data: {
      items: [],
      socket: getSocket('/')
    },
    render: function (createElement) {
      return createElement(Popout, { props: { socket, page, configuration } })
    }
  })
}

initPopout()
