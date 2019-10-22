import 'moment/min/locales.min';

import BootstrapVue from 'bootstrap-vue';
import moment from 'moment';
import momentTimezone from 'moment-timezone';
import Vue from 'vue';
import VueMoment from 'vue-moment';
import VueRouter from 'vue-router';
import Vuelidate from 'vuelidate';
import LoadScript from 'vue-plugin-load-script';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faSpotify, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons';
import {
  faBell, faCalendar, faCheckCircle, faCircle, faClock, faMoneyBillAlt,
} from '@fortawesome/free-regular-svg-icons';
import {
  faAngleDown, faAngleRight, faAngleUp, faBan, faBoxOpen, faCaretDown, faCaretLeft, faCaretRight,
  faCheck, faCircle as faCircle2, faCircleNotch, faClone, faCode, faCog, faCoins, faCommentAlt,
  faComments, faDollarSign, faDownload, faEdit, faEllipsisH, faEllipsisV, faEquals, faEraser,
  faExclamation, faExclamationCircle, faExternalLinkAlt, faEye, faEyeSlash, faFilter, faFont,
  faForward, faGem, faGift, faGreaterThanEqual, faGripVertical, faHandPointer, faHeadphones, faHeart, faImage,
  faInfinity, faLink, faList, faLock, faLockOpen, faLongArrowAltLeft, faLongArrowAltRight, faMinus,
  faMusic, faPause, faPlay, faPlus, faPlusSquare, faPowerOff, faQuestion, faRandom, faSave, faSearch,
  faShareSquare, faSignInAlt, faSignOutAlt, faSlash, faSpinner, faStar, faStarHalf, faStop,
  faSync, faSyncAlt, faTasks, faTerminal, faTh, faThLarge, faThList, faTimes, faToggleOff,
  faToggleOn, faTrash, faTrashAlt, faTrophy, faTv, faUpload, faUser, faUsers, faVial,
  faVolumeDown, faVolumeOff, faVolumeUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { get } from 'lodash-es';

import { ButtonStates, states } from 'src/panel/helpers/buttonStates';
import { setMainLoaded } from 'src/panel/helpers/isAvailableVariable';
import { isUserCaster, isUserLoggedIn } from 'src/panel/helpers/isUserLoggedIn';
import translate from 'src/panel/helpers/translate';
import urlParam from 'src/panel/helpers/urlParam';
import { getListOf } from 'src/panel/helpers/getListOf';
import { getConfiguration, getTranslations } from 'src/panel/helpers/socket';

library.add(faVolumeOff, faGripVertical, faImage, faUpload, faCircle2, faCaretRight, faTasks, faCaretDown, faSlash, faFilter, faToggleOn, faToggleOff, faBell, faShareSquare, faExclamationCircle, faQuestion, faVial, faEquals, faGreaterThanEqual, faLongArrowAltLeft, faBan, faPlusSquare, faMusic, faList, faPlay, faPause, faForward, faSpotify, faMoneyBillAlt, faPlus, faSpinner, faGift, faHeadphones, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faCalendar, faTwitter, faCheck, faMusic, faMusic, faVolumeUp, faVolumeDown, faUsers, faGift, faTrophy, faCog, faExternalLinkAlt, faTrash, faPlus, faSync, faComments, faTwitch, faCircle, faCheckCircle, faLock, faUsers, faUser, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom, faEyeSlash, faSignOutAlt, faSignInAlt, faBoxOpen, faEye, faCog, faExternalLinkAlt, faHeart, faTv, faRandom, faGem, faStar, faGift, faDollarSign, faStarHalf, faLongArrowAltRight, faCircleNotch, faCalendar, faDollarSign, faCog, faCode, faAngleUp, faTrashAlt, faAngleDown, faFont, faPlus, faMinus, faDownload, faDollarSign, faTerminal, faCog, faCommentAlt, faUsers, faExternalLinkAlt, faSyncAlt, faClock, faCog, faInfinity, faTrophy, faClone, faGem, faCoins, faExclamation, faStop, faBan, faSpinner, faCheck, faAngleRight, faPlus, faEdit, faEraser, faLink, faTrash, faPlus, faCaretLeft, faExternalLinkAlt, faLink, faSave, faThLarge, faThList, faSearch, faCircleNotch, faCheck, faEllipsisH, faEllipsisV, faPowerOff);
Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(VueMoment, {
  moment, momentTimezone,
});
Vue.use(BootstrapVue);
Vue.use(Vuelidate);
Vue.use(LoadScript);

/* import widely used components */
Vue.component('panel', () => import('./components/panel.vue'));
Vue.component('hold-button', () => import('./components/holdButton.vue'));
Vue.component('button-with-icon', () => import('./components/button.vue'));
Vue.component('state-button', () => import('./components/stateButton.vue'));
Vue.component('textarea-with-tags', () => import('./components/textareaWithTags.vue'));

declare module 'vue/types/vue' {
  interface Vue {
    configuration: any;
    $moment?: any;
    $loadScript: (script: string) => Promise<void>;
    $unloadScript: (script: string) => Promise<void>;
    $state: states;
    urlParam(key: string): string | null;
    translate(id: string): string;
    $loggedUser: any | null;
    $systems: {
      name: string;
      enabled: boolean;
      areDependenciesEnabled: boolean;
      isDisabledByEnv: boolean;
    }[];
    $core: {
      name: string;
      enabled: boolean;
      areDependenciesEnabled: boolean;
      isDisabledByEnv: boolean;
    }[];
    $integrations: {
      name: string;
      enabled: boolean;
      areDependenciesEnabled: boolean;
      isDisabledByEnv: boolean;
    }[];
  }
}

Vue.use(VueRouter);

declare global {
  interface Window {
    token: string | undefined;
  }
}

const main = async () => {
  // init prototypes
  Vue.prototype.translate = (v) => translate(v);
  Vue.prototype.urlParam = (v) => urlParam(v);


  if (typeof window.token !== 'undefined') {
    Vue.prototype.$loggedUser = await isUserLoggedIn();
    await isUserCaster(Vue.prototype.$loggedUser.id);

    Vue.prototype.$core = await getListOf('core');
    Vue.prototype.$systems = await getListOf('systems');
    Vue.prototype.$integrations = await getListOf('integrations');

    await getTranslations();
    Vue.prototype.configuration = await getConfiguration();
  }

  Vue.prototype.$state = ButtonStates;
  setMainLoaded();

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/:widget', name: 'Popout', component: () => import('src/panel/views/dashboard/popout.vue') },
    ],
  });

  new Vue({
    router,
    data() {
      const object: {
        token: any;
      } = {
        token: window.token,
      };
      return object;
    },
    created() {
      // set proper moment locale
      this.$moment.locale(get(Vue, 'prototype.configuration.lang', 'en'));

      // theme load
      const head = document.getElementsByTagName('head')[0];
      const link = (document.createElement('link') as any);
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href',`/dist/css/${get(Vue, 'prototype.configuration.core.ui.theme', 'light')}.css`);
      head.appendChild(link);
    },
    template: `
    <div id="app" >
      <template v-if="token">
        <router-view></router-view>
      </template>
      <template v-else>
      <div class="alert alert-danger ml-5 mr-5 mt-3" role="alert">
        This domain is not set as accessible in your <strong>config.json</strong>. Update your file and restart a bot to propagate changes. Example below:
      </div>
      <pre class="alert alert-info ml-5 mr-5" style="font-family: Monospace">
... config.json ...
"panel": {
"__COMMENT__": "set correctly your domain and to be safe, change your token",
"username": "***",
"password": "***",
"port": ***,
"domain": "yourdomain1, ${window.location.host.split(':')[0]}",
"token": "***"
},
... config.json ...
          </pre>
      </template>
    </div>
  `,
  }).$mount('#app');
};

main();
