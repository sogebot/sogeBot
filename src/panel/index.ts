import 'moment/min/locales.min';
import './others/quickStatsApp';
import './others/changegamedlg';
import './others/checklist';
import './widgets/dashboard';
import './widgets/popout';

import _ from 'lodash';
import Vue from 'vue';
import VueRouter from 'vue-router';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faSpotify, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons';
import {
  faBell, faCalendar, faCheckCircle, faCircle, faClock, faMoneyBillAlt,
} from '@fortawesome/free-regular-svg-icons';
import {
  faAngleDown, faAngleRight, faAngleUp, faBan, faBoxOpen, faTv, faCaretDown, faCaretLeft, faCaretRight,
  faCheck, faCircleNotch, faClone, faCode, faCog, faCoins, faCommentAlt, faComments, faDollarSign, faDownload,
  faEdit, faEllipsisH, faEllipsisV, faEquals, faEraser, faExclamation, faExclamationCircle,
  faExternalLinkAlt, faEye, faEyeSlash, faFilter, faFont, faForward, faGem, faGift, faGreaterThanEqual,
  faHandPointer, faHeadphones, faHeart, faInfinity, faLink, faList, faLock, faLockOpen,
  faLongArrowAltLeft, faLongArrowAltRight, faMinus, faMusic, faPause, faPlay, faPlus,
  faPlusSquare, faQuestion, faRandom, faSave, faSearch, faShareSquare, faSignInAlt, faSignOutAlt,
  faSlash, faSpinner, faStar, faStarHalf, faStop, faSync, faSyncAlt, faTasks, faTerminal, faTh, faThLarge,
  faThList, faTimes, faToggleOff, faToggleOn, faTrash, faTrashAlt, faTrophy, faUser, faUsers,
  faVial, faVolumeDown, faVolumeUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { isAvailableVariable, setMainLoaded } from './helpers/isAvailableVariable';
import translate from './helpers/translate';
import urlParam from './helpers/urlParam';

library.add(faCaretRight, faTasks, faCaretDown, faSlash, faFilter, faToggleOn, faToggleOff, faBell, faShareSquare, faExclamationCircle, faQuestion, faVial, faEquals, faGreaterThanEqual, faLongArrowAltLeft, faBan, faPlusSquare, faMusic, faList, faPlay, faPause, faForward, faSpotify, faMoneyBillAlt, faPlus, faSpinner, faTimes, faGift, faHeadphones, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faCalendar, faTwitter, faList, faCheck, faMusic, faMusic, faVolumeUp, faVolumeDown, faUsers, faGift, faTrophy, faCog, faExternalLinkAlt, faTrash, faPlus, faTimes, faSync, faComments, faTwitch, faCircle, faCheckCircle, faLock, faUsers, faUser, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom, faEyeSlash, faSignOutAlt, faSignInAlt, faBoxOpen, faEye, faCog, faExternalLinkAlt, faHeart, faTv, faRandom, faGem, faStar, faGift, faDollarSign, faStarHalf, faLongArrowAltRight, faCircleNotch, faCalendar, faDollarSign, faCog, faCode, faAngleUp, faTrashAlt, faAngleDown, faFont, faPlus, faMinus, faDownload, faDollarSign, faTerminal, faCog, faCommentAlt, faUsers, faExternalLinkAlt, faSyncAlt, faClock, faCog, faInfinity, faTrophy, faClone, faGem, faCoins, faExclamation, faStop, faBan, faSpinner, faCheck, faAngleRight, faPlus, faEdit, faEraser, faLink, faTrash, faPlus, faCaretLeft, faExternalLinkAlt, faLink, faSave, faThLarge, faThList, faSearch, faCircleNotch, faCheck, faEllipsisH, faEllipsisV);
Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);

import moment from 'moment';
import momentTimezone from 'moment-timezone';
import 'moment/min/locales.min';
import VueMoment from 'vue-moment';

Vue.use(VueMoment, {
  moment, momentTimezone,
});

import BootstrapVue from 'bootstrap-vue';
Vue.use(BootstrapVue);

import Vuelidate from 'vuelidate';
Vue.use(Vuelidate);

/* import widely used components */
Vue.component('panel', () => import('./components/panel.vue'));
Vue.component('hold-button', () => import('./components/holdButton.vue'));
Vue.component('button-with-icon', () => import('./components/button.vue'));
Vue.component('state-button', () => import('./components/stateButton.vue'));
Vue.component('textarea-with-tags', () => import('./components/textareaWithTags.vue'));

export interface Global {
  translations: any;
  configuration: any;
  isMainLoaded?: boolean;
}

declare var global: Global;
declare var token: string;

declare module 'vue/types/vue' {
  interface Vue {
    token: string;
    configuration: any;
    $moment?: any;
    _: _.LoDashStatic;
    urlParam(key: string): string | null;
    translate(id: string): string;
  }
}

Vue.use(VueRouter);

const main = async () => {
  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
  ]);

  // init prototypes
  Vue.prototype.translate = (v) => translate(v);
  Vue.prototype.urlParam = (v) => urlParam(v);
  Vue.prototype.token = token;
  Vue.prototype.configuration = global.configuration;
  Vue.prototype._ = _;

  setMainLoaded();

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/stats/commandcount', name: 'CommandCountLogger', component: () => import('./views/loggers/commandcount.vue') },

      { path: '/manage/hltb', name: 'HLTBManager', component: () => import('./views/managers/hltb.vue') },

      { path: '/manage/polls', name: 'PollsManager', component: () => import('./views/managers/polls.vue') },

      { path: '/manage/events/', redirect: '/manage/events/list' },
      { path: '/manage/events/list', name: 'EventsManagerList', component: () => import('./views/managers/events/list.vue') },
      { path: '/manage/events/edit/:id?', name: 'EventsManagerEdit', component: () => import('./views/managers/events/edit.vue') },

      { path: '/settings/permissions/:id?', name: 'PermissionsSettings', component: () => import('./views/settings/permissions.vue') },
      { path: '/registry/goals/list', name: 'GoalsRegistryList', component: () => import('./views/registries/goalsList.vue') },
      { path: '/registry/goals/edit/:id?', name: 'GoalsRegistryEdit', component: () => import('./views/registries/goalsEdit.vue') },
    ],
  });

  new Vue({
    router,
    created() {
      this.$moment.locale(global.configuration.core.general.lang); // set proper moment locale
    },
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#pages');
};

main();
