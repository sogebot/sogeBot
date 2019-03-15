/* globals translations token */
import './others/checklist';
import './widgets/dashboard';
import './widgets/popout';

import * as _ from 'lodash';
import Vue from 'vue';
import VueRouter from 'vue-router';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faSpotify, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons';
import {
    faCalendar, faCheckCircle, faCircle, faClock, faComments, faEyeSlash, faMoneyBillAlt,
} from '@fortawesome/free-regular-svg-icons';
import {
    faAngleDown, faAngleRight, faAngleUp, faBan, faBoxOpen, faBullhorn, faCaretLeft, faCheck,
    faCircleNotch, faClone, faCode, faCog, faCoins, faCommentAlt, faDollarSign, faDownload, faEdit,
    faEquals, faEraser, faExclamation, faExternalLinkAlt, faEye, faFont, faForward, faGem, faGift,
    faGreaterThanEqual, faHandPointer, faHeadphones, faHeart, faInfinity, faLink, faList, faLock,
    faLockOpen, faLongArrowAltLeft, faLongArrowAltRight, faMinus, faMusic, faPause, faPlay, faPlus,
    faPlusSquare, faQuestion, faRandom, faSave, faSearch, faSignInAlt, faSignOutAlt, faSpinner,
    faStar, faStarHalf, faStop, faSync, faSyncAlt, faTerminal, faTh, faThLarge, faThList, faTimes,
    faTrash, faTrashAlt, faTrophy, faUser, faUsers, faVial, faVolumeDown, faVolumeUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import isAvailableVariable from './helpers/isAvailableVariable';
import translate from './helpers/translate';
import urlParam from './helpers/urlParam';

library.add(faQuestion, faVial, faEquals, faGreaterThanEqual, faLongArrowAltLeft, faBan, faPlusSquare, faMusic, faList, faPlay, faPause, faForward, faSpotify, faMoneyBillAlt, faComments, faPlus, faSpinner, faTimes, faGift, faHeadphones, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faCalendar, faTwitter, faList, faCheck, faMusic, faMusic, faVolumeUp, faVolumeDown, faUsers, faGift, faTrophy, faCog, faExternalLinkAlt, faTrash, faPlus, faTimes, faSync, faComments, faEyeSlash, faTwitch, faCircle, faCheckCircle, faLock, faUsers, faUser, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom, faEyeSlash, faSignOutAlt, faSignInAlt, faBoxOpen, faEye, faCog, faExternalLinkAlt, faHeart, faBullhorn, faRandom, faGem, faStar, faGift, faDollarSign, faStarHalf, faLongArrowAltRight, faCircleNotch, faCalendar, faDollarSign, faCog, faCode, faAngleUp, faTrashAlt, faAngleDown, faFont, faPlus, faMinus, faDownload, faDollarSign, faTerminal, faCog, faCommentAlt, faUsers, faExternalLinkAlt, faSyncAlt, faClock, faCog, faInfinity, faTrophy, faClone, faGem, faCoins, faExclamation, faStop, faBan, faSpinner, faCheck, faAngleRight, faPlus, faEdit, faEraser, faLink, faTrash, faPlus, faCaretLeft, faExternalLinkAlt, faLink, faSave, faThLarge, faThList, faSearch, faCircleNotch, faCheck);
Vue.component('fa', FontAwesomeIcon);

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

  const router = new VueRouter({
    mode: 'hash',
    base: __dirname,
    routes: [
      { path: '/manage/polls', name: 'PollsManager', component: () => import('./views/managers/polls.vue') },
      { path: '/settings/permissions/:id?', name: 'PermissionsSettings', component: () => import('./views/settings/permissions.vue') },
      { path: '/registry/goals/list', name: 'GoalsRegistryList', component: () => import('./views/registries/goalsList.vue') },
      { path: '/registry/goals/edit/:id?', name: 'GoalsRegistryEdit', component: () => import('./views/registries/goalsEdit.vue') },
    ],
  });

  new Vue({
    router,
    template: `
      <div id="app">
        <router-view class="view"></router-view>
      </div>
    `,
  }).$mount('#pages');
};

main();
