<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden" fill content-class="blackbg").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center.shrink
              fa(icon="grip-vertical" fixed-width)
          li.nav-item.shrink
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-ytplayer')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-item(@click="nextAndRemoveFromPlaylist")
                | skip &amp; remove from playlist
              template(v-if="!popout")
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'ytplayer'))" class="text-danger")
                    | Remove <strong>{{translate('widget-title-ytplayer')}}</strong> widget

        b-tab(title-item-class="shrink")
          template(v-slot:title)
            small {{ requests.length }} &nbsp;
            fa(icon='list')
          b-card-text
            table.table.table-sm
              tr(v-for="(request, index) of requests" :key="index")
                td
                  hold-button(@trigger="removeSongRequest(String(request._id))" :icon="'times'" class="btn-outline-danger border-0")
                td {{request.title}}
                td {{request.username}}
                td.pr-4 {{request.length_seconds | formatTime}}
        b-tab(active title-link-class="p-0 text-left overflow" title-item-class="widthmincontent")
          template(v-slot:title)
            button(@click="play" v-if="!autoplay").btn.nav-btn.btn-success
              fa(icon="play")
            button(@click="pause" v-else).btn.nav-btn.btn-danger
              fa(icon="pause")
            button(@click="next").btn.nav-btn.btn-secondary
              fa(icon="forward")
            span(style="position:relative; top: 2px;").align-self-center.mx-2
              fa(icon="play" v-if="autoplay")
              fa(icon="pause" v-else)
          b-card-text.vcenter
            vue-plyr(
              ref="player"
              v-if="currentSong !== null"
              :emit="['timeupdate', 'ended']"
              @timeupdate="videoTimeUpdated"
              @ended="videoEnded"
              :options='{ controls: ["volume", "progress", "current-time", "restart", "mute"], fullscreen: { enabled: false }, clickToPlay: false }'
              :key="(currentSong || { videoID: ''}).videoID"
            )
              div(
                data-plyr-provider="youtube"
                :data-plyr-embed-id="(currentSong || { videoID: ''}).videoID"
              )
</template>

<script>
import Vue from 'vue'
import VuePlyr from 'vue-plyr'
import { EventBus } from 'src/panel/helpers/event-bus';
import { isEqual } from 'lodash-es'
import { getSocket } from 'src/panel/helpers/socket';
Vue.use(VuePlyr)

export default {
  props: ['popout', 'nodrag'],
  components: {
    holdButton: () => import('../../components/holdButton.vue'),
  },
  data: function () {
    return {
      EventBus,
      autoplay: false,
      waitingForNext: false,

      currentSong: null,
      requests: [],

      player: null,

      socket: getSocket('/systems/songs'),
      interval: [],
    }
  },
  updated() {
    if (this.$refs.player) {
      this.player = this.$refs.player.player;
    }
  },
  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
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
    nextAndRemoveFromPlaylist() {
      if (this.currentSong) {
        this.socket.emit('delete.playlist', this.currentSong._id);
        this.next()
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
    playThisSong(item, retry = 0) {
      this.waitingForNext = false
      if (!item) {
        this.currentSong = null
        return
      }

      if (retry > 10 && this.currentSong && this.currentSong.videoID !== item.videoID) {
        return;
      } else {
        this.currentSong = item
      }
      try {
        if (item.startTime) this.player.currentTime = item.startTime
        this.player.volume = item.volume / 100
        this.player.muted = true
        this.$nextTick(() => {
          if (this.autoplay) {
          this.player.play()
          }
          this.player.muted = false
        })
      } catch (e) {
        return setTimeout(() => {
          console.log('Retrying playThisSong')
          console.log('If song si not playing and you are on Chrome, disable adblockers or popup blockers - https://github.com/sampotts/plyr/issues/1538')
          this.playThisSong(item, retry++); //retry after while
        }, 1000)
      }
    }
  },
  created: function () {
    this.socket.on('videoID', item => {
      this.player = null; // reset player
      this.playThisSong(item)
    })

    this.socket.on('isPlaying', cb => {
      if (this.player) {
        cb(this.player.playing);
      } else {
        cb(false);
      }
    })

    this.interval.push(setInterval(() => {
      this.socket.emit('find.request', {}, (err, items) => {
        if (!isEqual(this.requests, items)) {
          if (this.currentSong === null && this.autoplay) {
            this.next();
          }
        }
        this.requests = items
      })
    }, 1000));
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
<style>
  .shrink {
    flex: 0 1 auto !important;
  }
  .plyr__video-embed iframe {
    z-index: 2;
  }
  .overflow {
    height: 36px;
    overflow:hidden;
  }
  .widthmincontent{
    width: min-content;
  }
  .blackbg {
    background-color: black;
  }
</style>