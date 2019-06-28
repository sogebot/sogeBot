<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item"  style="flex-shrink: 0">
        <a class="nav-link" href="#yt-song-requests" aria-controls="home" role="tab" data-toggle="tab" title="Song Requests">
          <small>{{ requests.length }}</small>
          <fa icon="list" />
        </a>
      </li>
      <li role="presentation" class="nav-item" style="flex-shrink: 0">
        <button class="btn nav-btn btn-success" @click="play" v-if="!autoplay">
          <fa icon="play" />
        </button>
        <button class="btn nav-btn btn-danger" @click="pause" v-else>
          <fa icon="pause" />
        </button>
      </li>
      <li role="presentation" class="nav-item" style="flex-shrink: 0">
        <button class="btn nav-btn btn-secondary" @click="next">
          <fa icon="forward" />
        </button>
      </li>
      <li role="presentation" class="nav-item w-100">
        <a class="nav-link active" href="#yt-main" aria-controls="home" role="tab" data-toggle="tab" title="Song Requests">
          <fa icon="play" v-if="autoplay"/>
          <fa icon="pause" v-else/>
          <template v-if="currentSong">{{ currentSong.title }}</template>
        </a>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane" id="yt-song-requests">
        <table class="table table-sm">
          <tr v-for="(request, index) of requests" :key="index">
            <td><hold-button @trigger="removeSongRequest(String(request._id))" :icon="'times'" class="btn-outline-danger border-0"></hold-button></td>
            <td>{{request.title}}</td>
            <td>{{request.username}}</td>
            <td class="pr-4">{{request.length_seconds | formatTime}}</td>
          </tr>
        </table>
      </div>
      <div role="tabpanel" class="tab-pane active" id="yt-main">
        <vue-plyr ref="player"
          class="vcenter"
          v-if="currentSong !== null"
          :emit="['timeupdate', 'ended']"
          @timeupdate="videoTimeUpdated"
          @ended="videoEnded"
          :options='{ controls: ["volume", "progress", "current-time", "restart", "mute"], fullscreen: { enabled: false }, clickToPlay: false }'
          :key="(currentSong || { videoID: ''}).videoID">
          <div data-plyr-provider="youtube" :data-plyr-embed-id="(currentSong || { videoID: ''}).videoID"></div>
        </vue-plyr>
      </div>

      <div class="clearfix"></div>
    </div>
  </div>
</div>
</template>

<script>
import Vue from 'vue'
import VuePlyr from 'vue-plyr'
Vue.use(VuePlyr)

export default {
  props: ['token', 'commons'],
  components: {
    holdButton: () => import('../../components/holdButton.vue'),
  },
  data: function () {
    return {
      autoplay: false,
      waitingForNext: false,

      currentSong: null,
      requests: [],

      player: null,

      socket: io('/systems/songs', { query: "token=" + token })
    }
  },
  updated() {
    if (this.$refs.player) {
      this.player = this.$refs.player.player;
    }
  },
  methods: {
    removeSongRequest(_id) {
      console.log('Removing => ' + _id)
      this.requests = this.requests.filter((o) => String(o._id) !== _id)
      this.socket.emit('delete', { collection: 'request', where: { _id } })
    },
    videoEnded: function (event) {
      console.debug('[YTPLAYER.ended] - autoplay ', this.autoplay)
      this.currentSong = null;
      if (this.autoplay) {
        this.next();
      }
    },
    videoTimeUpdated: function (event) {
      if (this.autoplay && this.currentSong) {
        if (this.currentSong.endTime && event.detail.plyr.currentTime >= this.currentSong.endTime) {
          this.next() // go to next if we are at endTime
        }
      }
    },
    next: function () {
      if (!this.waitingForNext) {
        this.waitingForNext = true
        if (this.player) this.player.pause()
        this.socket.emit('next')
      }
    },
    pause: function () {
      this.autoplay = false
      if (this.player && this.currentSong) this.player.pause()
    },
    play: function () {
      this.autoplay = true
      if (this.player && this.currentSong) this.player.play()
      if (this.currentSong === null) {
        this.socket.emit('next')
      }
    },
    playThisSong(item, retry = false) {
      if (!item) {
        this.currentSong = null
        return
      }
      this.waitingForNext = false

      if (retry && this.currentSong && this.currentSong.videoID !== item.videoID) {
        return;
      } else {
        this.currentSong = item
      }
      if (!this.player) {
        return setTimeout(() => {
          console.log('retrying playThisSong')
          this.playThisSong(item, true); //retry after while
        }, 500)
      }
      this.player.once('ready', event => {
        if (item.startTime) this.player.currentTime = item.startTime
        this.player.volume = item.volume / 100
        this.player.muted = true
        this.$nextTick(() => {
          if (this.autoplay) {
            this.player.play()
          }
          this.player.muted = false
        })
      })
    }
  },
  created: function () {
    this.socket.on('videoID', item => {
      this.player = null; // reset player
      this.playThisSong(item)
    })

    setInterval(() => {
      this.socket.emit('find.request', {}, (err, items) => {
        this.requests = items
      })
    }, 1000)
  },
  filters: {
    formatTime: function (seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [
        h,
        m > 9 ? m : (h ? '0' + m : m || '0'),
        s > 9 ? s : '0' + s,
      ].filter(a => a).join(':');
    }
  },
  mounted: function () {
    this.$emit('mounted')
  }
}
</script>

<style scoped>
  .nav { flex-wrap: initial; }

  #yt-main { background-color: black; }
  .vcenter {
    position: relative;
    top: 50%;
    transform: translate(0, -50%);
  }
</style>