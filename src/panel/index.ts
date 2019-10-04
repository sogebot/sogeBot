import 'moment/min/locales.min';
import './others/quickStatsApp';
import './others/changegamedlg';
import './others/checklist';
import './others/user';
import './others/menu';
import './others/footer';
import './widgets/dashboard';
import './widgets/popout';

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
  faForward, faGem, faGift, faGreaterThanEqual, faHandPointer, faHeadphones, faHeart, faImage,
  faInfinity, faLink, faList, faLock, faLockOpen, faLongArrowAltLeft, faLongArrowAltRight, faMinus,
  faMusic, faPause, faPlay, faPlus, faPlusSquare, faPowerOff, faQuestion, faRandom, faSave, faSearch,
  faShareSquare, faSignInAlt, faSignOutAlt, faSlash, faSpinner, faStar, faStarHalf, faStop,
  faSync, faSyncAlt, faTasks, faTerminal, faTh, faThLarge, faThList, faTimes, faToggleOff,
  faToggleOn, faTrash, faTrashAlt, faTrophy, faTv, faUpload, faUser, faUsers, faVial,
  faVolumeDown, faVolumeUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { ButtonStates, states } from './helpers/buttonStates';
import { isAvailableVariable, setMainLoaded } from './helpers/isAvailableVariable';
import { isUserCaster, isUserLoggedIn } from './helpers/isUserLoggedIn';
import translate from './helpers/translate';
import urlParam from './helpers/urlParam';
import { getListOf } from './helpers/getListOf';

library.add(faImage, faUpload, faCircle2, faCaretRight, faTasks, faCaretDown, faSlash, faFilter, faToggleOn, faToggleOff, faBell, faShareSquare, faExclamationCircle, faQuestion, faVial, faEquals, faGreaterThanEqual, faLongArrowAltLeft, faBan, faPlusSquare, faMusic, faList, faPlay, faPause, faForward, faSpotify, faMoneyBillAlt, faPlus, faSpinner, faTimes, faGift, faHeadphones, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faCalendar, faTwitter, faList, faCheck, faMusic, faMusic, faVolumeUp, faVolumeDown, faUsers, faGift, faTrophy, faCog, faExternalLinkAlt, faTrash, faPlus, faTimes, faSync, faComments, faTwitch, faCircle, faCheckCircle, faLock, faUsers, faUser, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom, faEyeSlash, faSignOutAlt, faSignInAlt, faBoxOpen, faEye, faCog, faExternalLinkAlt, faHeart, faTv, faRandom, faGem, faStar, faGift, faDollarSign, faStarHalf, faLongArrowAltRight, faCircleNotch, faCalendar, faDollarSign, faCog, faCode, faAngleUp, faTrashAlt, faAngleDown, faFont, faPlus, faMinus, faDownload, faDollarSign, faTerminal, faCog, faCommentAlt, faUsers, faExternalLinkAlt, faSyncAlt, faClock, faCog, faInfinity, faTrophy, faClone, faGem, faCoins, faExclamation, faStop, faBan, faSpinner, faCheck, faAngleRight, faPlus, faEdit, faEraser, faLink, faTrash, faPlus, faCaretLeft, faExternalLinkAlt, faLink, faSave, faThLarge, faThList, faSearch, faCircleNotch, faCheck, faEllipsisH, faEllipsisV, faPowerOff);
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

export interface Global {
  translations: any;
  configuration: any;
  isMainLoaded?: boolean;
}

declare let global: Global;

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

const main = async () => {
  // init prototypes
  Vue.prototype.translate = (v) => translate(v);
  Vue.prototype.urlParam = (v) => urlParam(v);

  Vue.prototype.$loggedUser = await isUserLoggedIn();
  await isUserCaster(Vue.prototype.$loggedUser.id);

  Vue.prototype.$core = await getListOf('core');
  Vue.prototype.$systems = await getListOf('systems');
  Vue.prototype.$integrations = await getListOf('integrations');

  await Promise.all([
    isAvailableVariable('translations'),
    isAvailableVariable('configuration'),
  ]);
  Vue.prototype.configuration = global.configuration;
  Vue.prototype.$state = ButtonStates;

  setMainLoaded();

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/', name: 'Dashboard', component: () => import('./views/dashboard/stub.vue') },
      { path: '/stats/commandcount', name: 'CommandCountLogger', component: () => import('./views/loggers/commandcount.vue') },

      { path: '/manage/alias/', redirect: '/manage/alias/list' },
      { path: '/manage/alias/list', name: 'aliasManagerList', component: () => import('./views/managers/alias/alias-list.vue') },
      { path: '/manage/alias/edit/:id?', name: 'aliasManagerEdit', component: () => import('./views/managers/alias/alias-edit.vue') },
      { path: '/manage/commands/', redirect: '/manage/commands/list' },
      { path: '/manage/commands/list', name: 'CommandsManagerList', component: () => import('./views/managers/commands/commands-list.vue') },
      { path: '/manage/commands/edit/:id?', name: 'CommandsManagerEdit', component: () => import('./views/managers/commands/commands-edit.vue') },
      { path: '/manage/hltb', name: 'HLTBManager', component: () => import('./views/managers/hltb.vue') },
      { path: '/manage/polls', name: 'PollsManager', component: () => import('./views/managers/polls.vue') },
      { path: '/manage/events/', redirect: '/manage/events/list' },
      { path: '/manage/events/list', name: 'EventsManagerList', component: () => import('./views/managers/events/list.vue') },
      { path: '/manage/events/edit/:id?', name: 'EventsManagerEdit', component: () => import('./views/managers/events/edit.vue') },
      { path: '/manage/keywords/', redirect: '/manage/keywords/list' },
      { path: '/manage/keywords/list', name: 'KeywordsManagerList', component: () => import('./views/managers/keywords/keywords-list.vue') },
      { path: '/manage/keywords/edit/:id?', name: 'KeywordsManagerEdit', component: () => import('./views/managers/keywords/keywords-edit.vue') },
      { path: '/manage/quotes/list', name: 'QuotesManagerList', component: () => import('./views/managers/quotes/quotes-list.vue') },
      { path: '/manage/quotes/edit/:id?', name: 'QuotesManagerEdit', component: () => import('./views/managers/quotes/quotes-edit.vue') },

      { path: '/settings/permissions/:id?', name: 'PermissionsSettings', component: () => import('./views/settings/permissions.vue') },
      { path: '/settings/:type/:id?', name: 'InterfaceSettings', component: () => import('./views/settings/interface.vue') },

      { path: '/registry/alerts/list', name: 'alertsList', component: () => import('./views/registries/alerts/alerts-list.vue') },
      { path: '/registry/alerts/edit/:id?', name: 'alertsEdit', component: () => import('./views/registries/alerts/alerts-edit.vue') },
      { path: '/registry/customvariables/list', name: 'CustomVariableList', component: () => import('./views/registries/custom-variables/custom-variables-list.vue') },
      { path: '/registry/customvariables/edit/:id?', name: 'CustomVariableEdit', component: () => import('./views/registries/custom-variables/custom-variables-edit.vue') },
      { path: '/registry/textoverlay/list', name: 'TextOverlayList', component: () => import('./views/registries/text-overlay/text-overlay-list.vue') },
      { path: '/registry/textoverlay/edit/:id?', name: 'TextOverlayEdit', component: () => import('./views/registries/text-overlay/text-overlay-edit.vue') },
      { path: '/registry/goals/list', name: 'GoalsRegistryList', component: () => import('./views/registries/goalsList.vue') },
      { path: '/registry/goals/edit/:id?', name: 'GoalsRegistryEdit', component: () => import('./views/registries/goalsEdit.vue') },
    ],
  });

  new Vue({
    router,
    created() {
      this.$moment.locale(global.configuration.lang); // set proper moment locale
    },
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#pages');
};

main();
