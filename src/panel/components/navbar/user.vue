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
        <b-button variant="danger" class="float-right" @click="logout">
          <fa icon="sign-out-alt" fixed-width /> Logout
        </b-button>
      </b-dropdown-text>
      <b-dropdown-text v-else style="width:300px;">
        <loading no-margin/>
      </b-dropdown-text>
    </b-dropdown>
    <b-dropdown v-else no-caret variant="light" toggle-class="btn-sm p-0 pl-1 pr-1">
      <template v-slot:button-content>
        <b-img blank-color="#777" src="https://via.placeholder.com/50?text=?" rounded="circle" alt="Circle image" style="width:30px;"></b-img>
        Not logged in
      </template>
      <b-dropdown-text style="width:300px;">
        <b-button variant="success" class="float-right" @click="login">
          <fa icon="sign-in-alt" fixed-width /> Login
        </b-button>
      </b-dropdown-text>
    </b-dropdown>
  </div>
</template>


<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { PermissionsInterface } from 'src/bot/database/entity/permissions'

@Component({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  }
})
export default class User extends Vue {
  data: any = null;
  socket = getSocket('/core/users', true);
  interval = 0;

  isViewerLoaded: boolean = false;
  viewer: {
    id: number; points: number;
    permission: PermissionsInterface | null;
    stats: {
      aggregatedTips: number; aggregatedBits: number; messages: number;
    };
    time: {
      watched: number;
    };
    is: {
      follower: boolean; subscriber: boolean; vip: boolean;
    };
    custom: {
      currency: string;
    };
  } = {
    id: 0,
    points: 0,
    permission: null,
    stats: {
      aggregatedTips: 0, aggregatedBits: 0, messages: 0
    },
    time: {
      watched: 0,
    },
    is: {
      follower: false, subscriber: false, vip: false
    },
    custom: {
      currency: 'EUR',
    },
  }

  beforeDestroy() {
    clearInterval(this.interval);
  }

  get viewerIs(): string[] {
    let status: string[] = [];
    for (const key of ['isFollower', 'isSubscriber', 'isVIP']) {
      if (this.viewer && this.viewer[key]) {
        status.push(key.replace('is', ''));
      }
    }
    return status;
  }

  async mounted() {
    this.refreshViewer();
    this.interval = window.setInterval(() => {
      this.refreshViewer();
    }, 60000)
  }

  logout() {
    localStorage.setItem('code', '');
    window.location.replace(window.location.origin + '/login#error=logged+out');
  }

  login() {
    window.location.replace(window.location.origin + '/login');
  }

  refreshViewer() {
    if (typeof this.$loggedUser === 'undefined'|| this.$loggedUser === null) {
      return;
    }
    this.socket.emit('viewers::findOne', this.$loggedUser.id, (err, viewer) => {
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