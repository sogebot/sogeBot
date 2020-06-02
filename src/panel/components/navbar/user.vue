<template>
  <div class="ml-2 mr-2">
    <b-dropdown no-caret variant="light" toggle-class="btn-sm p-0 pl-1 pr-1" v-if="$loggedUser">
      <template v-slot:button-content>
        <b-img :src="$loggedUser.profile_image_url" rounded="circle" alt="Circle image" style="width:30px;"></b-img>
        {{$loggedUser.login}}
      </template>
      <b-dropdown-text v-if="isViewerLoaded" style="width:300px;">
        <div class="row">
          <div style="position: absolute;right: 1rem;">
            <b-img :src="$loggedUser.profile_image_url" rounded="circle" alt="Circle image" style="width:70px;"></b-img>
          </div>
          <div v-if="viewer" class="col-12" style="justify-content: center; display: flex; flex-direction: column;">
            <div><strong style="font-size: 1.2rem">{{$loggedUser.login}}</strong> <small class="text-muted">({{$loggedUser.id}})</small></div>
            <div style="font-size: 0.8rem" class="text-secondary">
              <span v-for="k of viewerIs" :key="k"> {{k}} </span>
            </div>
            <div v-if="viewer.permission"><strong style="font-size: 0.9rem" class="text-muted">{{translate('group')}}:</strong>  {{viewer.permission.name}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('points')}}:</strong>  {{viewer.points}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('messages')}}:</strong>  {{viewer.messages}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('watched-time')}}:</strong>  {{Math.floor(viewer.watchedTime / 1000 / 60 / 60).toFixed(1)}}h</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('bits')}}:</strong>  {{viewer.aggregatedBits}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('tips')}}:</strong>  {{viewer.aggregatedTips}} {{configuration.currency}}</div>
          </div>
        </div>
        <b-button-group class="pt-2 w-100">
          <b-button variant="dark" v-if="isPublicPage() && viewer.permission.id === permission.CASTERS" href="/">
            Go to Admin
          </b-button>
          <b-button variant="dark" v-if="!isPublicPage()" href="/public/">
            Go to Public
          </b-button>
          <b-button variant="danger" class="float-right" @click="logout">
            <fa icon="sign-out-alt" fixed-width /> Logout
          </b-button>
        </b-button-group>
      </b-dropdown-text>
      <b-dropdown-text v-else style="width:300px;">
        <loading no-margin/>
      </b-dropdown-text>
    </b-dropdown>
    <template v-else>
      <b-button @click="login" class="border-0 ml-1 p-1 pl-2 pr-2 btn-sm" variant="light">
        <fa icon="user-circle" fixed-width/>
        Not logged in
      </b-button>
    </template>
  </div>
</template>


<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import { permission } from 'src/bot/helpers/permissions'

import { library } from '@fortawesome/fontawesome-svg-core';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons'
import { UserInterface } from '../../../bot/database/entity/user';
import { PermissionsInterface } from '../../../bot/database/entity/permissions';
library.add(faUserCircle);

@Component({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  }
})
export default class User extends Vue {
  data: any = null;
  socket = getSocket('/core/users', true);
  interval = 0;

  permission = permission;

  isViewerLoaded: boolean = false;
  viewer: (Required<UserInterface> & { aggregatedTips: number; aggregatedBits: number; permission: PermissionsInterface }) | null = null;

  beforeDestroy() {
    clearInterval(this.interval);
  }

  get viewerIs(): string[] {
    let status: string[] = [];
    const isArray = ['isFollower', 'isSubscriber', 'isVIP'] as const;
    isArray.forEach((item: typeof isArray[number]) => {
      if (this.viewer && this.viewer[item]) {
        status.push(item.replace('is', ''));
      }
    })
    return status;
  }

  async mounted() {
    this.refreshViewer();
    this.interval = window.setInterval(() => {
      this.refreshViewer();
    }, 60000)
  }

  isPublicPage() {
    return window.location.href.includes('public');
  }

  logout() {
    this.socket.emit('logout', {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    });
    localStorage.setItem('code', '');
    localStorage.setItem('accessToken', '');
    localStorage.setItem('refreshToken', '');
    localStorage.setItem('userType', 'unauthorized');
    window.location.replace(window.location.origin + '/login#error=logged+out');
  }

  login() {
    window.location.replace(window.location.origin + '/login');
  }

  refreshViewer() {
    if (typeof this.$loggedUser === 'undefined'|| this.$loggedUser === null) {
      return;
    }
    this.socket.emit('viewers::findOne', this.$loggedUser.id, (err: string| number, viewer: Readonly<Required<UserInterface>> & { aggregatedTips: number; aggregatedBits: number; permission: PermissionsInterface }) => {
      if (err) {
        return console.error(err);
      }
      if (viewer) {
        console.log('Logged in as', viewer);
        this.viewer = viewer;
        this.isViewerLoaded = true;
      } else {
        console.error('Cannot find user data, try to write something in chat to load data')
      }
    })
  }
}
</script>