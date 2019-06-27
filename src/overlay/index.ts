import _ from 'lodash';
import Vue from 'vue';
import Overlays from './index.vue';

import { isAvailableVariable } from '../panel/helpers/isAvailableVariable';
import translate from '../panel/helpers/translate';

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
    render(createElement) {
      return createElement(Overlays, { props: { token } });
    },
  }).$mount('#overlays');
};

overlays();
