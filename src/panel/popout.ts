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
import { isUserLoggedIn } from 'src/panel/helpers/isUserLoggedIn';
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
    $loadScript: (script: string) => Promise<void>;
    $unloadScript: (script: string) => Promise<void>;
    $state: states;
    urlParam(key: string): string | null;
    $loggedUser: any | null;
    $systems: {
      name: string;
      enabled: boolean;
      areDependenciesEnabled: boolean;
      isDisabledByEnv: boolean;
    }[];
    $core: {
      name: string;
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

const main = async () => {
  // init prototypes
  Vue.prototype.translate = (v: string) => translate(v);
  Vue.prototype.urlParam = (v: string) => urlParam(v);
  Vue.prototype.$loggedUser = await isUserLoggedIn();

  if (Vue.prototype.$loggedUser !== false) {
    await getTranslations();
    Vue.prototype.configuration = await getConfiguration();
    Vue.prototype.$core = await getListOf('core');
    Vue.prototype.$systems = await getListOf('systems');
    Vue.prototype.$integrations = await getListOf('integrations');

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
      created() {
        // set proper moment locale
        this.$moment.locale(get(Vue, 'prototype.configuration.lang', 'en'));

        // theme load
        const theme = localStorage.getItem('theme');
        const head = document.getElementsByTagName('head')[0];
        const link = (document.createElement('link') as any);
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href',`/dist/css/${theme || get(Vue, 'prototype.configuration.core.ui.theme', 'light')}.css`);
        head.appendChild(link);
      },
      template: `
      <div id="app" >
        <router-view></router-view>
      </div>
    `,
    }).$mount('#app');
  }
};

main();
