/* globals translations token */
import Vue from 'vue'
import Overlays from './index.vue'
import * as _ from 'lodash'

import translate from '../panel/helpers/translate';
import isAvailableVariable from '../panel/helpers/isAvailableVariable';

export interface Global {
  translations: any;
  configuration: any;
}

declare var global: Global;
declare var token: string;

declare module 'vue/types/vue' {
  interface Vue {
    token: string;
    configuration: any;
    $moment?: any;
    _: _.LoDashStatic;
  }
}

const overlays = async () => {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
  ]);

  Vue.prototype.translate = (v) => translate(v);
  Vue.prototype.token = token;
  Vue.prototype.configuration = global.configuration;
  Vue.prototype._ = _;

  new Vue({ // eslint-disable-line no-new
    el: '#overlays',
    render: function (createElement) {
      return createElement(Overlays, { props: { token } })
    }
  })
}

overlays();

