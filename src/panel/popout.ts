import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faSpotify, faTwitch, faTwitter,
} from '@fortawesome/free-brands-svg-icons';
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
import { getConfiguration, getTranslations } from '@sogebot/ui-helpers/socket';
import VueCompositionAPI from '@vue/composition-api';
import BootstrapVue from 'bootstrap-vue';
import { get } from 'lodash-es';
import Vue from 'vue';
import LoadScript from 'vue-plugin-load-script';
import VueRouter from 'vue-router';
import Vuelidate from 'vuelidate';

import { setLocale } from 'src/bot/helpers/dayjs';
import { ButtonStates, states } from 'src/panel/helpers/buttonStates';
import type { getListOfReturn } from 'src/panel/helpers/getListOf';
import { getListOf, populateListOf } from 'src/panel/helpers/getListOf';
import { setMainLoaded } from 'src/panel/helpers/isAvailableVariable';
import { isUserLoggedIn } from 'src/panel/helpers/isUserLoggedIn';
import urlParam from 'src/panel/helpers/urlParam';

import { isBotStarted } from './helpers/isBotStarted';
import { store } from './helpers/store';

library.add(faVolumeOff, faGripVertical, faImage, faUpload, faCircle2, faCaretRight, faTasks, faCaretDown, faSlash, faFilter, faToggleOn, faToggleOff, faBell, faShareSquare, faExclamationCircle, faQuestion, faVial, faEquals, faGreaterThanEqual, faLongArrowAltLeft, faBan, faPlusSquare, faMusic, faList, faPlay, faPause, faForward, faSpotify, faMoneyBillAlt, faPlus, faSpinner, faGift, faHeadphones, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faCalendar, faTwitter, faCheck, faMusic, faMusic, faVolumeUp, faVolumeDown, faUsers, faGift, faTrophy, faCog, faExternalLinkAlt, faTrash, faPlus, faSync, faComments, faTwitch, faCircle, faCheckCircle, faLock, faUsers, faUser, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom, faEyeSlash, faSignOutAlt, faSignInAlt, faBoxOpen, faEye, faCog, faExternalLinkAlt, faHeart, faTv, faRandom, faGem, faStar, faGift, faDollarSign, faStarHalf, faLongArrowAltRight, faCircleNotch, faCalendar, faDollarSign, faCog, faCode, faAngleUp, faTrashAlt, faAngleDown, faFont, faPlus, faMinus, faDownload, faDollarSign, faTerminal, faCog, faCommentAlt, faUsers, faExternalLinkAlt, faSyncAlt, faClock, faCog, faInfinity, faTrophy, faClone, faGem, faCoins, faExclamation, faStop, faBan, faSpinner, faCheck, faAngleRight, faPlus, faEdit, faEraser, faLink, faTrash, faPlus, faCaretLeft, faExternalLinkAlt, faLink, faSave, faThLarge, faThList, faSearch, faCircleNotch, faCheck, faEllipsisH, faEllipsisV, faPowerOff);
Vue.component('Fa', FontAwesomeIcon);
Vue.component('FontAwesomeIcon', FontAwesomeIcon);

Vue.use(BootstrapVue);
Vue.use(Vuelidate);
Vue.use(LoadScript);
Vue.use(VueCompositionAPI);

/* import widely used components */
Vue.component('Panel', () => import('./components/panel.vue'));
Vue.component('Theme', () => import('./components/navbar/theme.vue'));
Vue.component('HoldButton', () => import('./components/holdButton.vue'));
Vue.component('ButtonWithIcon', () => import('./components/button.vue'));
Vue.component('StateButton', () => import('./components/stateButton.vue'));
Vue.component('TextareaWithTags', () => import('./components/textareaWithTags.vue'));

declare module 'vue/types/vue' {
  interface Vue {
    $loadScript: (script: string) => Promise<void>;
    $unloadScript: (script: string) => Promise<void>;
    $state: states;
    urlParam(key: string): string | null;
    $systems: getListOfReturn['systems'];
    $core: getListOfReturn['core'];
    $integrations: getListOfReturn['integrations'];
  }
}

Vue.use(VueRouter);

const main = async () => {
  await isBotStarted();

  // init prototypes
  Vue.prototype.urlParam = (v: string) => urlParam(v);
  store.commit('setLoggedUser', await isUserLoggedIn());

  if (store.state.loggedUser !== false) {
    await getTranslations();
    store.commit('setConfiguration', await getConfiguration());
    await populateListOf('core');
    await populateListOf('systems');
    await populateListOf('integrations');
    Vue.prototype.$core = await getListOf('core');
    Vue.prototype.$systems = getListOf('systems');
    Vue.prototype.$integrations = await getListOf('integrations');
    Vue.prototype.$state = ButtonStates;
    setMainLoaded();

    const router = new VueRouter({
      mode:   'hash',
      base:   __dirname,
      routes: [
        {
          path: '/:widget', name: 'Popout', component: () => import('src/panel/views/dashboard/popout.vue'),
        },
      ],
    });

    new Vue({
      store,
      router,
      created() {
        // set proper dayjs locale
        setLocale(get(this.$store.state, 'configuration.lang', 'en'));
      },
      template: `
      <div id="app">
        <theme v-show="false"/> <!-- we need theme component to properly load theme -->
        <router-view></router-view>
      </div>
    `,
    }).$mount('#app');
  }
};

main();
