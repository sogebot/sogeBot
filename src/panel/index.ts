import 'moment/min/locales.min';

import BootstrapVue from 'bootstrap-vue';
import moment from 'moment';
import momentTimezone from 'moment-timezone';
import Vue from 'vue';
import VueMoment from 'vue-moment';
import VueRouter from 'vue-router';
import Vuelidate from 'vuelidate';
import VueCompositionAPI from '@vue/composition-api';

// eslint-disable-next-line
import LoadScript from 'vue-plugin-load-script';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faSpotify, faTwitch, faTwitter } from '@fortawesome/free-brands-svg-icons';
import {
  faBell, faCalendar, faCheckCircle, faCircle, faClock, faMoneyBillAlt,
} from '@fortawesome/free-regular-svg-icons';
import {
  faAngleDown, faAngleRight, faAngleUp, faBan, faBoxOpen, faCaretDown, faCaretLeft, faCaretRight,
  faCheck, faCircle as faCircle2, faCircleNotch, faClone, faCode, faCog, faCoins, faCommentAlt,
  faComments, faDice, faDollarSign, faDownload, faEdit, faEllipsisH, faEllipsisV, faEquals, faEraser,
  faExclamation, faExclamationCircle, faExternalLinkAlt, faEye, faEyeSlash, faFilter, faFont,
  faForward, faGem, faGift, faGlobeEurope, faGreaterThanEqual, faGripVertical, faHandPointer, faHeadphones, faHeart,
  faHistory, faImage, faInfinity, faLink, faList, faLock, faLockOpen, faLongArrowAltLeft,
  faLongArrowAltRight, faMinus, faMusic, faPause, faPlay, faPlus, faPlusSquare, faPowerOff, faQuestion, faRandom,
  faRedoAlt, faSave, faSearch, faShareSquare, faSignInAlt, faSignOutAlt, faSlash, faSortDown,
  faSortUp, faSpinner, faStar, faStarHalf, faStop, faSync, faSyncAlt, faTasks, faTerminal,
  faTh, faThLarge, faThList, faTimes, faToggleOff, faToggleOn, faTrash, faTrashAlt, faTrophy,
  faTv, faUpload, faUser, faUsers,  faVial, faVolumeDown, faVolumeOff, faVolumeUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import { get } from 'lodash-es';

import { ButtonStates, states } from './helpers/buttonStates';
import { setMainLoaded } from './helpers/isAvailableVariable';
import { isUserLoggedIn } from './helpers/isUserLoggedIn';
import translate from './helpers/translate';
import urlParam from './helpers/urlParam';
import { getListOf, populateListOf } from './helpers/getListOf';
import type { getListOfReturn } from './helpers/getListOf';
import { store } from './helpers/store';
import { getConfiguration, getTranslations } from './helpers/socket';

library.add(faGlobeEurope, faHistory,faSortUp, faSortDown, faRedoAlt, faDice, faVolumeOff, faGripVertical, faImage, faUpload, faCircle2, faCaretRight, faTasks, faCaretDown, faSlash, faFilter, faToggleOn, faToggleOff, faBell, faShareSquare, faExclamationCircle, faQuestion, faVial, faEquals, faGreaterThanEqual, faLongArrowAltLeft, faBan, faPlusSquare, faMusic, faList, faPlay, faPause, faForward, faSpotify, faMoneyBillAlt, faPlus, faSpinner, faGift, faHeadphones, faTh, faDollarSign, faSignInAlt, faSignOutAlt, faUsers, faMusic, faCalendar, faTwitter, faCheck, faMusic, faMusic, faVolumeUp, faVolumeDown, faUsers, faGift, faTrophy, faCog, faExternalLinkAlt, faTrash, faPlus, faSync, faComments, faTwitch, faCircle, faCheckCircle, faLock, faUsers, faUser, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom, faEyeSlash, faSignOutAlt, faSignInAlt, faBoxOpen, faEye, faCog, faExternalLinkAlt, faHeart, faTv, faRandom, faGem, faStar, faGift, faDollarSign, faStarHalf, faLongArrowAltRight, faCircleNotch, faCalendar, faDollarSign, faCog, faCode, faAngleUp, faTrashAlt, faAngleDown, faFont, faPlus, faMinus, faDownload, faDollarSign, faTerminal, faCog, faCommentAlt, faUsers, faExternalLinkAlt, faSyncAlt, faClock, faCog, faInfinity, faTrophy, faClone, faGem, faCoins, faExclamation, faStop, faBan, faSpinner, faCheck, faAngleRight, faPlus, faEdit, faEraser, faLink, faTrash, faPlus, faCaretLeft, faExternalLinkAlt, faLink, faSave, faThLarge, faThList, faSearch, faCircleNotch, faCheck, faEllipsisH, faEllipsisV, faPowerOff);
Vue.component('fa', FontAwesomeIcon);
Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(VueMoment, {
  moment, momentTimezone,
});
Vue.use(BootstrapVue);
Vue.use(Vuelidate);
Vue.use(LoadScript);
Vue.use(VueCompositionAPI);

/* import widely used components */
Vue.component('panel', () => import('./components/panel.vue'));
Vue.component('hold-button', () => import('./components/holdButton.vue'));
Vue.component('button-with-icon', () => import('./components/button.vue'));
Vue.component('state-button', () => import('./components/stateButton.vue'));
Vue.component('textarea-with-tags', () => import('./components/textareaWithTags.vue'));

declare module 'vue/types/vue' {
  interface Vue {
    $loadScript: (script: string) => Promise<void>;
    $unloadScript: (script: string) => Promise<void>;
    $state: states;
    urlParam(key: string): string | null;
    translate(id: string): string;
    $systems: getListOfReturn['systems'];
    $core: getListOfReturn['core'];
    $integrations: getListOfReturn['integrations'];
  }
}

Vue.use(VueRouter);

const main = async () => {
  // init prototypes
  Vue.prototype.translate = (v: string) => translate(v);
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

    console.debug({
      core: Vue.prototype.$core,
      systems: Vue.prototype.$systems,
      integrations: Vue.prototype.$integrations,
    });

    Vue.prototype.$state = ButtonStates;
    setMainLoaded();

    const router = new VueRouter({
      mode: 'hash',
      base: __dirname,
      routes: [
        { path: '/', name: 'Dashboard', component: () => import('./views/dashboard/empty.vue') },
        { path: '/stats/api', name: 'APIStats', component: () => import('./views/stats/api.vue') },
        { path: '/stats/commandcount', name: 'CommandCountStats', component: () => import('./views/stats/commandcount.vue') },
        { path: '/stats/tips', name: 'TipsStats', component: () => import('./views/stats/tips.vue') },
        { path: '/stats/bits', name: 'BitsStats', component: () => import('./views/stats/bits.vue') },

        { path: '/manage/alias/', redirect: '/manage/alias/list' },
        { path: '/manage/alias/list', name: 'aliasManager', component: () => import('./views/managers/alias.vue') },
        { path: '/manage/alias/edit/:id?', name: 'aliasManagerEdit', component: () => import('./views/managers/alias.vue') },
        { path: '/manage/commands/', redirect: '/manage/commands/list' },
        { path: '/manage/commands/list', name: 'CommandsManagerList', component: () => import('./views/managers/commands.vue') },
        { path: '/manage/commands/edit/:id?', name: 'CommandsManagerEdit', component: () => import('./views/managers/commands.vue') },
        { path: '/manage/cooldowns/', redirect: '/manage/cooldowns/list' },
        { path: '/manage/cooldowns/list', name: 'cooldownsManager', component: () => import('./views/managers/cooldowns.vue') },
        { path: '/manage/cooldowns/edit/:id?', name: 'cooldownsManagerEdit', component: () => import('./views/managers/cooldowns.vue') },
        { path: '/manage/highlights', name: 'HighlightsManager', component: () => import('./views/managers/highlights.vue') },
        { path: '/manage/hltb', name: 'HLTBManager', component: () => import('./views/managers/hltb.vue') },
        { path: '/manage/polls', name: 'PollsManager', component: () => import('./views/managers/polls.vue') },
        { path: '/manage/events/', redirect: '/manage/events/list' },
        { path: '/manage/events/list', name: 'EventsManagerList', component: () => import('./views/managers/events/list.vue') },
        { path: '/manage/events/edit/:id?', name: 'EventsManagerEdit', component: () => import('./views/managers/events/edit.vue') },
        { path: '/manage/keywords/', redirect: '/manage/keywords/list' },
        { path: '/manage/keywords/list', name: 'KeywordsManager', component: () => import('./views/managers/keyword.vue') },
        { path: '/manage/keywords/edit/:id?', name: 'KeywordsManagerEdit', component: () => import('./views/managers/keyword.vue') },
        { path: '/manage/price/', redirect: '/manage/price/list' },
        { path: '/manage/price/list', name: 'PriceManager', component: () => import('./views/managers/price.vue') },
        { path: '/manage/price/edit/:id?', name: 'PriceManagerEdit', component: () => import('./views/managers/price.vue') },
        { path: '/manage/quotes/', redirect: '/manage/quotes/list' },
        { path: '/manage/quotes/list', name: 'QuotesManagerList', component: () => import('./views/managers/quotes.vue') },
        { path: '/manage/quotes/edit/:id?', name: 'QuotesManagerEdit', component: () => import('./views/managers/quotes.vue') },
        { path: '/manage/ranks/', redirect: '/manage/ranks/list' },
        { path: '/manage/ranks/list', name: 'RanksManagerList', component: () => import('./views/managers/ranks.vue') },
        { path: '/manage/ranks/edit/:id?', name: 'RanksManagerEdit', component: () => import('./views/managers/ranks.vue') },
        { path: '/manage/songs/playlist', name: 'songsManagerPlaylist', component: () => import('./views/managers/songs/songs-playlist.vue') },
        { path: '/manage/songs/bannedsongs', name: 'songsManagerBannedsongs', component: () => import('./views/managers/songs/songs-bannedsongs.vue') },
        { path: '/manage/spotify/bannedsongs', name: 'spotifyManagerBannedsongs', component: () => import('./views/managers/spotify/spotify-bannedsongs.vue') },
        { path: '/manage/timers/list', name: 'TimersManagerList', component: () => import('./views/managers/timers/timers-list.vue') },
        { path: '/manage/timers/edit/:id?', name: 'TimersManagerEdit', component: () => import('./views/managers/timers/timers-edit.vue') },
        { path: '/manage/viewers/list', name: 'viewersManagerList', component: () => import('./views/managers/viewers/viewers-list.vue') },
        { path: '/manage/viewers/edit/:id?', name: 'viewersManagerEdit', component: () => import('./views/managers/viewers/viewers-edit.vue') },

        { path: '/settings/permissions/:id?', name: 'PermissionsSettings', component: () => import('./views/settings/permissions.vue') },
        { path: '/settings/translations', name: 'TranslationsSettings', component: () => import('./views/settings/translations.vue') },
        { path: '/settings/:type/:id?', name: 'InterfaceSettings', component: () => import('./views/settings/interface.vue') },

        { path: '/registry/alerts/list', name: 'alertsList', component: () => import('./views/registries/alerts/alerts-list.vue') },
        { path: '/registry/alerts/edit/:id?', name: 'alertsEdit', component: () => import('./views/registries/alerts/alerts-edit.vue') },
        { path: '/registry/customvariables/list', name: 'CustomVariableList', component: () => import('./views/registries/custom-variables/custom-variables-list.vue') },
        { path: '/registry/customvariables/edit/:id?', name: 'CustomVariableEdit', component: () => import('./views/registries/custom-variables/custom-variables-edit.vue') },
        { path: '/registry/carousel/list', name: 'carouselRegistryList', component: () => import('./views/registries/carousel-overlay/carousel-overlay-list.vue') },
        { path: '/registry/carousel/edit/:id?', name: 'carouselRegistryEdit', component: () => import('./views/registries/carousel-overlay/carousel-overlay-edit.vue') },
        { path: '/registry/randomizer/list', name: 'RandomizerRegistryList', component: () => import('./views/registries/randomizer/randomizer-list.vue') },
        { path: '/registry/randomizer/edit/:id?', name: 'RandomizerRegistryEdit', component: () => import('./views/registries/randomizer/randomizer-edit.vue') },
        { path: '/registry/textoverlay/list', name: 'TextOverlayList', component: () => import('./views/registries/text-overlay/text-overlay-list.vue') },
        { path: '/registry/textoverlay/edit/:id?', name: 'TextOverlayEdit', component: () => import('./views/registries/text-overlay/text-overlay-edit.vue') },
        { path: '/registry/gallery/list', name: 'galleryRegistryEdit', component: () => import('./views/registries/gallery/gallery-list.vue') },
        { path: '/registry/goals/list', name: 'GoalsRegistryList', component: () => import('./views/registries/goals/goals-list.vue') },
        { path: '/registry/goals/edit/:id?', name: 'GoalsRegistryEdit', component: () => import('./views/registries/goals/goals-edit.vue') },
      ],
    });

    new Vue({
      store,
      router,
      components: {
        dashboard: () => import('./views/dashboard/dashboard.vue'),
        navbar: () => import('./components/navbar/navbar.vue'),
        statsbar: () => import('./components/statsbar/statsbar.vue'),
        changegamedialog: () => import('./components/dialog/changegamedialog.vue'),
        footerbar: () => import('./components/footer.vue'),
      },
      data() {
        const object: {
          isDropdownHidden: boolean;
          dropdown: any;
          dropdownVue: any;
        } = {
          isDropdownHidden: true,
          dropdown: null,
          dropdownVue: null,
        };
        return object;
      },
      created() {
        this.$root.$on('bv::dropdown::show', (bvEvent: Bootstrap.DropdownsEventHandler<HTMLElement>) => {
          this.dropdownShow(bvEvent);
        });

        this.$root.$on('bv::dropdown::hidden', (bvEvent: Bootstrap.DropdownsEventHandler<HTMLElement>) => {
          this.dropdownHide();

          // force unfocus
          setTimeout(() => {
            (document.activeElement as HTMLElement).blur();
          }, 10);
        });

        // set proper moment locale
        this.$moment.locale(get(this.$store.state, 'configuration.lang', 'en'));
      },
      methods: {
        clickEvent(event: MouseEvent) {
          if (event.target) {
            if ((typeof (event.target as HTMLElement).className !== 'string' || !(event.target as HTMLElement).className.includes('dropdown')) && !this.isDropdownHidden) {
              console.debug('Clicked outside dropdown', event.target);
              this.dropdownHide();
            }
          }
        },
        dropdownHide() {
          if (!this.isDropdownHidden) {
            this.dropdownVue.hide();
            this.dropdown.remove();
            this.isDropdownHidden = true;
          }
        },
        dropdownShow(bvEvent: Bootstrap.DropdownsEventHandler<HTMLElement>) {
          if (!this.isDropdownHidden) {
            this.dropdownHide();
          }

          this.isDropdownHidden = false;
          const child = bvEvent.target;
          child.style.position = 'absolute';
          child.style.zIndex = '99999999';
          child.remove();
          document.getElementsByTagName('BODY')[0].appendChild(child);
          this.dropdown = child;
          this.dropdownVue = (bvEvent as any).vueTarget;
          this.dropdownVue.show();
        },
      },
      template: `
        <div id="app" @click.capture="clickEvent">
          <navbar/>
          <statsbar/>
          <changegamedialog/>
          <dashboard
            class="view pt-1"
            :style="{
              visibility: $route.path === '/' ? 'visible' : 'hidden',
              position: $route.path === '/' ? 'inherit' : 'absolute'
            }"
          />
          <router-view
            class="view pt-1"
            :style="{
              visibility: $route.path !== '/' ? 'visible' : 'hidden',
              position: $route.path !== '/' ? 'inherit' : 'absolute'
            }"
          />
          <footerbar/>
        </div>
      `,
    }).$mount('#app');
  }
};

main();
