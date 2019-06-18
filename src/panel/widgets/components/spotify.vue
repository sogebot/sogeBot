<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item" style="flex-shrink: 0">
        <hold-button class="nav-link btn btn-outline-danger border-0 h-100 pl-1 pr-1" @trigger="cleanupSongRequestList()">
          <template v-slot:icon>
            <font-awesome-layers>
              <fa icon="list" transform="left-3"/>
              <fa icon="times" transform="shrink-8 down-9 right-9"/>
            </font-awesome-layers>
          </template>
        </hold-button>
      </li>
      <li role="presentation" class="nav-item" style="flex-shrink: 0">
        <a class="nav-link active" href="#spotify-song-requests" aria-controls="home" role="tab" data-toggle="tab" title="Song Requests">
          <small>{{ requests.length }}</small>
          <fa icon="list" />
        </a>
      </li>
      <li role="presentation" class="nav-item" style="flex-shrink: 0">
        <button class="btn nav-btn btn-link" @click="next">
          <fa icon="forward" />
        </button>
      </li>
      <li role="presentation" class="nav-item" style="flex-shrink: 0">
        <button :class="[songRequestsEnabled ? 'btn-outline-success' : 'btn-outline-danger']"
                class="nav-link btn btn-outline-success border-0 h-100 pl-1 pr-1"
                @click="songRequestsEnabled = !songRequestsEnabled">
          <fa icon="check" fixed-width v-if="songRequestsEnabled"/>
          <fa icon="times" fixed-width v-else />
          {{ command }}
        </button>
      </li>
      <li role="presentation" class="nav-item" style="flex-shrink: 0">
        <button :class="[continueOnPlaylistAfterRequest ? 'btn-outline-success' : 'btn-outline-danger']"
                class="nav-link btn btn-outline-success border-0 h-100 pl-1 pr-1"
                @click="continueOnPlaylistAfterRequest = !continueOnPlaylistAfterRequest">
          <fa icon="check" fixed-width v-if="continueOnPlaylistAfterRequest"/>
          <fa icon="times" fixed-width v-else />
          PLAYLIST
        </button>
      </li>
      <li role="presentation" class="w-100 pl-1 pr-1" style="line-height: 2.55rem;">
        <marquee-text :repeat="10" v-if="currentSong.is_playing">
          <fa icon="music" class="pl-1 pr-1" fixed-width />
          {{ currentSong.song }} - {{ currentSong.artist }}
        </marquee-text>
        <template v-else>
          No song is currently playing
        </template>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="spotify-song-requests">
        <table class="table table-sm">
          <tr v-for="(request, index) of requests" :key="index">
            <td>
              <hold-button @trigger="removeSongRequest(String(index))" :icon="'times'" class="btn-outline-danger btn-only-icon border-0"></hold-button>
            </td>
            <td>{{request.song}}</td>
            <td>{{request.artist}}</td>
            <td>{{request.requestBy}}</td>
          </tr>
        </table>
      </div>
      <div class="clearfix"></div>
    </div>
  </div>
</div>
</template>

<script>
import MarqueeText from 'vue-marquee-text-component'
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'

export default {
  props: ['token', 'commons'],
  components: {
    holdButton: () => import('../../components/holdButton.vue'),
    'font-awesome-layers': FontAwesomeLayers,
    MarqueeText,
  },
  data: function () {
    return {
      currentSong: {},
      requests: [],
      command: '!spotify',
      songRequestsEnabled: true,
      continueOnPlaylistAfterRequest: true,

      socket: io('/integrations/spotify', { query: "token=" + token })
    }
  },
  watch: {
    songRequestsEnabled: _.debounce(function (val) {
      this.socket.emit('settings.update', { songRequests: val })
    }, 500),
    continueOnPlaylistAfterRequest: _.debounce(function (val) {
      this.socket.emit('settings.update', { output: { continueOnPlaylistAfterRequest: val } })
    }, 500)
  },
  methods: {
    next(index) {
      this.requests.splice(index, 1);
      this.socket.emit('skip', () => {});
    },
    cleanupSongRequestList() {
      this.requests = [];
      this.socket.emit('set.value', 'uris', this.requests)
    },
    removeSongRequest(index) {
      this.requests.splice(index, 1)
      this.socket.emit('set.value', 'uris', this.requests)
    },
    fetchCurrentSong() {
      this.socket.emit('get.value', 'currentSong', (err, v) => {
        this.currentSong = JSON.parse(v);
        setTimeout(this.fetchCurrentSong, 1000)
      })
    },
    fetchSongRequests() {
      this.socket.emit('get.value', 'uris', (err, v) => {
        this.requests = v
        setTimeout(this.fetchSongRequests, 1000)
      })
    }
  },
  created: function () {
    this.socket.emit('settings', (err, s) => {
      this.command = s.commands['!spotify'];
      this.songRequestsEnabled = s.songRequests;
      this.continueOnPlaylistAfterRequest = s.continueOnPlaylistAfterRequest;
      setTimeout(this.fetchCurrentSong, 1000)
      setTimeout(this.fetchSongRequests, 1000)
    })
  },
  mounted: function () {
    this.$emit('mounted')
  }
}
</script>

<style scoped>
  .nav { flex-wrap: initial; }
</style>