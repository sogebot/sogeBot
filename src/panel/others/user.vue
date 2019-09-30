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
          <div class="col-12" style="justify-content: center; display: flex; flex-direction: column;">
            <div><strong style="font-size: 1.2rem">{{$loggedUser.login}}</strong> <small class="text-muted">({{$loggedUser.id}})</small></div>
            <div style="font-size: 0.8rem" class="text-secondary">
              <span v-for="k of viewerIs" :key="k"> {{k}} </span>
            </div>
            <div v-if="viewer.permission"><strong style="font-size: 0.9rem" class="text-muted">{{translate('group')}}:</strong>  {{viewer.permission.name}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('points')}}:</strong>  {{viewer.points}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('messages')}}:</strong>  {{viewer.stats.messages}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('watched-time')}}:</strong>  {{Math.floor(viewer.time.watched / 1000 / 60 / 60).toFixed(1)}}h</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('bits')}}:</strong>  {{viewer.stats.aggregatedBits}}</div>
            <div><strong style="font-size: 0.9rem" class="text-muted">{{translate('tips')}}:</strong>  {{viewer.stats.aggregatedTips}} {{viewer.custom.currency}}</div>
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
  </div>
</template>


<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from '../helpers/socket';

@Component({
  components: {
    'loading': () => import('../components/loading.vue'),
  }
})
export default class User extends Vue {
  data: any = null;
  socket = getSocket('/core/users');
  interval = 0;

  isViewerLoaded: boolean = false;
  viewer: {
    id: number; points: number;
    permission: Permissions.Item | null;
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
    for (const key of Object.keys(this.viewer.is)) {
      if (this.viewer.is[key]) {
        status.push(key);
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

  refreshViewer() {
    if (typeof this.$loggedUser === 'undefined') {
      return setTimeout(() => this.refreshViewer(), 100);
    }
    this.socket.emit('findOne.viewer', { where: { id: this.$loggedUser.id }}, (err, viewer) => {
      this.viewer = viewer;
      this.isViewerLoaded = true;
    })
  }
}
</script>