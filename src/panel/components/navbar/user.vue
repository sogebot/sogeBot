<template>
  <div class="ml-2 mr-2">
    <b-dropdown
      v-if="$store.state.loggedUser"
      no-caret
      variant="light"
      toggle-class="btn-sm p-0 pl-1 pr-1"
    >
      <template #button-content>
        <b-img
          :src="$store.state.loggedUser.profile_image_url"
          rounded="circle"
          alt="Circle image"
          style="width:30px;"
        />
        {{ $store.state.loggedUser.login }}
      </template>
      <b-dropdown-text
        v-if="isViewerLoaded"
        style="width:300px;"
      >
        <div class="row">
          <div style="position: absolute;right: 1rem;">
            <b-img
              :src="$store.state.loggedUser.profile_image_url"
              rounded="circle"
              alt="Circle image"
              style="width:70px;"
            />
          </div>
          <div
            v-if="viewer"
            class="col-12"
            style="justify-content: center; display: flex; flex-direction: column;"
          >
            <div><strong style="font-size: 1.2rem">{{ $store.state.loggedUser.login }}</strong> <small class="text-muted">({{ $store.state.loggedUser.id }})</small></div>
            <div
              style="font-size: 0.8rem"
              class="text-secondary"
            >
              <span
                v-for="k of viewerIs"
                :key="k"
              > {{ k }} </span>
            </div>
            <div v-if="viewer.permission">
              <strong
                style="font-size: 0.9rem"
                class="text-muted"
              >{{ translate('group') }}:</strong>  {{ viewer.permission.name }}
            </div>
            <div>
              <strong
                style="font-size: 0.9rem"
                class="text-muted"
              >{{ translate('points') }}:</strong>
              {{ Intl.NumberFormat($store.state.configuration.lang).format(viewer.points) }}
            </div>
            <div>
              <strong
                style="font-size: 0.9rem"
                class="text-muted"
              >{{ translate('messages') }}:</strong>
              {{ Intl.NumberFormat($store.state.configuration.lang).format(viewer.messages) }}
            </div>
            <div>
              <strong
                style="font-size: 0.9rem"
                class="text-muted"
              >{{ translate('watched-time') }}:</strong>
              {{ Intl.NumberFormat($store.state.configuration.lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(viewer.watchedTime / 1000 / 60 / 60) }} h
            </div>
            <div>
              <strong
                style="font-size: 0.9rem"
                class="text-muted"
              >{{ translate('bits') }}:</strong>
              {{ Intl.NumberFormat($store.state.configuration.lang).format(viewer.aggregatedBits) }}
            </div>
            <div>
              <strong
                style="font-size: 0.9rem"
                class="text-muted"
              >{{ translate('tips') }}:</strong>
              {{ Intl.NumberFormat($store.state.configuration.lang, { style: 'currency', currency: $store.state.configuration.currency }).format(viewer.aggregatedTips) }}
            </div>
          </div>
        </div>
        <b-button-group class="pt-2 w-100">
          <b-button
            v-if="isPublicPage && viewer.permission.id === defaultPermissions.CASTERS"
            variant="dark"
            href="/"
          >
            {{ translate('go-to-admin') }}
          </b-button>
          <b-button
            v-if="!isPublicPage"
            variant="dark"
            href="/public/"
          >
            {{ translate('go-to-public') }}
          </b-button>
          <b-button
            variant="danger"
            class="float-right"
            @click="logout"
          >
            <fa
              icon="sign-out-alt"
              fixed-width
            /> {{ translate('logout') }}
          </b-button>
        </b-button-group>
      </b-dropdown-text>
      <b-dropdown-text
        v-else
        style="width:300px;"
      >
        <loading no-margin />
      </b-dropdown-text>
    </b-dropdown>
    <template v-else>
      <b-button
        class="border-0 ml-1 p-1 pl-2 pr-2 btn-sm"
        variant="light"
        @click="login"
      >
        <fa
          icon="user-circle"
          fixed-width
        />
        {{ translate('not-logged-in') }}
      </b-button>
    </template>
  </div>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, onUnmounted, ref,
} from '@vue/composition-api';
import type { Ref } from '@vue/composition-api';

import { defaultPermissions } from 'src/bot/helpers/permissions/defaultPermissions';

import { PermissionsInterface } from '../../../bot/database/entity/permissions';
import { UserInterface } from '../../../bot/database/entity/user';

library.add(faUserCircle);

const socket = getSocket('/core/users', true);
let interval = 0;

export default defineComponent({
  components: { 'loading': () => import('src/panel/components/loading.vue') },
  setup(props, context) {
    const isViewerLoaded = ref(false);
    const viewer: Ref<(Required<UserInterface> & { aggregatedTips: number; aggregatedBits: number; permission: PermissionsInterface }) | null> = ref(null);
    const viewerIs = computed(() => {
      const status: string[] = [];
      const isArray = ['isFollower', 'isSubscriber', 'isVIP'] as const;
      isArray.forEach((item: typeof isArray[number]) => {
        if (viewer.value && viewer.value[item]) {
          status.push(item.replace('is', ''));
        }
      });
      return status;
    });
    const isPublicPage = computed(() => window.location.href.includes('public'));

    onMounted(() => {
      refreshViewer();
      interval = window.setInterval(() => {
        refreshViewer();
      }, 60000);
    });
    onUnmounted(() => clearInterval(interval));

    const logout = () => {
      socket.emit('logout', {
        accessToken:  localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
      });
      localStorage.setItem('code', '');
      localStorage.setItem('accessToken', '');
      localStorage.setItem('refreshToken', '');
      localStorage.setItem('userType', 'unauthorized');
      window.location.assign(window.location.origin + '/login#error=logged+out');
    };
    const login = () => window.location.assign(window.location.origin + '/login');
    const refreshViewer = () => {
      if (typeof context.root.$store.state.loggedUser === 'undefined'|| context.root.$store.state.loggedUser === null) {
        return;
      }
      socket.emit('viewers::findOne', context.root.$store.state.loggedUser.id, (err: string| number, recvViewer: Readonly<Required<UserInterface>> & { aggregatedTips: number; aggregatedBits: number; permission: PermissionsInterface }) => {
        if (err) {
          return console.error(err);
        }
        if (recvViewer) {
          console.log('Logged in as', recvViewer);
          viewer.value = recvViewer;
          isViewerLoaded.value = true;
        } else {
          console.error('Cannot find user data, try to write something in chat to load data');
        }
      });
    };
    return {
      defaultPermissions, isViewerLoaded, viewer, viewerIs, isPublicPage, logout, login, translate,
    };
  },
});
</script>