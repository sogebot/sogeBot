<template>
  <div class="widget">
    <b-card class="border-0 h-100" no-body>
      <b-tabs class="h-100" pills card style="overflow:hidden" fill content-class="blackbg">
        <template v-slot:tabs-start>
          <template v-if="!popout">
            <li class="nav-item px-2 grip text-secondary align-self-center shrink" v-if="!nodrag">
              <fa icon="grip-vertical" fixed-width></fa>
            </li>
          </template>
          <li class="nav-item shrink">
            <b-dropdown ref="dropdown" boundary="window" no-caret :text="translate('widget-title-ytplayer') + ' - ' + currentTag" variant="outline-primary" toggle-class="border-0">
              <b-dropdown-form class="form">
                <label>Playlist</label>
                <b-select v-model="currentTag">
                  <b-form-select-option v-for="tag of availableTags" v-bind:key="tag" :value="tag">{{tag}}</b-form-select-option>
                </b-select>
              </b-dropdown-form>
              <b-dropdown-item @click="nextAndRemoveFromPlaylist">skip &amp; remove from playlist</b-dropdown-item>
              <template v-if="!popout">
                <b-dropdown-divider></b-dropdown-divider>
                <b-dropdown-item><a class="text-danger" href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'ytplayer'))" v-html="translate('remove-widget').replace('$name', translate('widget-title-ytplayer'))"></a></b-dropdown-item>
              </template>
            </b-dropdown>
          </li>
        </template>
        <b-tab title-item-class="shrink">
          <template v-slot:title><small>{{ requests.length }} &nbsp;</small>
            <fa icon="list"></fa>
          </template>
          <b-card-text>
            <table class="table table-sm">
              <tr v-for="(request, index) of requests" :key="index">
                <td>
                  <b-button variant="outline-danger" class="border-0" @click="removeSongRequest(String(request.id))" :icon="'times'"></b-button>
                </td>
                <td>{{request.title}}</td>
                <td>{{request.username}}</td>
                <td class="pr-4">{{formatTime(request.length_seconds)}}</td>
              </tr>
            </table>
          </b-card-text>
        </b-tab>
        <b-tab active title-link-class="p-0 text-left overflow" title-item-class="widthmincontent">
          <template v-slot:title>
            <b-button-group>
              <button class="btn nav-btn btn-success" @click="play" v-if="!autoplay">
                <fa icon="play"></fa>
              </button>
              <button class="btn nav-btn btn-danger" @click="pause" v-else>
                <fa icon="pause"></fa>
              </button>
              <button class="btn nav-btn btn-secondary" @click="next">
                <fa icon="forward"></fa>
              </button>
            </b-button-group>
            <span class="align-self-center mx-2" style="position:relative; top: 2px;">
              <fa icon="play" v-if="autoplay"></fa>
              <fa icon="pause" v-else></fa></span>
          </template>
          <b-card-text class="vcenter">
            <vue-plyr ref="playerRef" :key="updateTime + (currentSong || { videoId: ''}).videoId" v-if="currentSong !== null"
              @timeupdate="videoTimeUpdated"
              @ended="videoEnded"
              :options="{ controls: ['volume', 'progress', 'current-time', 'restart', 'mute'], fullscreen: { enabled: false }, clickToPlay: false }">
              <div data-plyr-provider="youtube" :data-plyr-embed-id="(currentSong || { videoId: ''}).videoId"></div>
            </vue-plyr>
          </b-card-text>
        </b-tab>
      </b-tabs>
    </b-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, onUnmounted, computed } from '@vue/composition-api'
import Vue from 'vue'
import VuePlyr from 'vue-plyr'

import { EventBus } from 'src/panel/helpers/event-bus';
import { isEqual } from 'lodash-es'
import { getSocket } from 'src/panel/helpers/socket';
Vue.use(VuePlyr)
import translate from 'src/panel/helpers/translate';

import type { SongRequestInterface } from 'src/bot/database/entity/song';

type Props = {
  popout: boolean;
  nodrag: boolean;
};

const socket = getSocket('/systems/songs');
export default defineComponent({
  props: {
    popout: Boolean,
    nodrag: Boolean,
  },
  setup(props: Props, ctx) {
    const currentTag = ref('general');
    const availableTags = ref ([] as string[]);
    const autoplay = ref(false);
    const waitingForNext = ref(false);
    const currentSong = ref(null as null | any);
    const requests = ref([] as SongRequestInterface[]);
    const playerRef = ref(null as null | any);
    const player = computed(() => {
      return playerRef.value ? playerRef.value.player : null
    });
    const updateTime = ref(Date.now());
    const intervals = [] as number[];

    watch(currentTag, (val) => socket.emit('set.playlist.tag', val));

    const refreshPlaylist = () => {
      socket.emit('current.playlist.tag', (err: null, tag: string) => {
        currentTag.value = tag;
      });
      socket.emit('get.playlist.tags', (err: null, tags: string[]) => {
        availableTags.value = tags;
      })
    };

    const removeSongRequest = (id: string) => {
      if (confirm('Do you want to delete song request ' + requests.value.find(o => String(o.id) === id)?.title + ' from ' + requests.value.find(o => String(o.id) === id)?.username + '?')) {
        console.log('Removing => ' + id)
        requests.value = requests.value.filter((o) => String(o.id) !== id)
        socket.emit('songs::removeRequest', id, () => {})
      }
    };

    const videoEnded = () => {
      console.debug('[YTPLAYER.ended] - autoplay ', autoplay.value)
      currentSong.value = null;
      if (autoplay.value) {
        next();
      }
    };

    const videoTimeUpdated = (event: any) => {
      if (autoplay.value && currentSong.value) {
        if (currentSong.value.endTime && event.detail.plyr.currentTime >= currentSong.value.endTime) {
          next() // go to next if we are at endTime
        }
      }
    };

    const nextAndRemoveFromPlaylist = () => {
      if (currentSong.value) {
        socket.emit('delete.playlist', currentSong.value.id);
        next()
      }
    };

    const next = () => {
      if (!waitingForNext.value) {
        waitingForNext.value = true
        if (player.value) player.value.pause()
        socket.emit('next')
      }
    };

    const pause = () => {
      autoplay.value = false
      if (player.value && currentSong.value) player.value.pause()
    };

    const play = () => {
      autoplay.value = true
      if (currentSong.value) {
        if (!player.value) {
          setTimeout(() => play(), 1000);
          return;
        };
        player.value.play();
      }
      if (currentSong.value === null) {
        socket.emit('next')
      }
    };

    const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [
        h,
        m > 9 ? m : (h ? '0' + m : m || '0'),
        s > 9 ? s : '0' + s,
      ].filter(a => a).join(':');
    }

    const playThisSong = (item: any, retry = 0) => {
      waitingForNext.value = false
      if (!item) {
        currentSong.value = null
        return
      }

      if (retry > 10 && currentSong.value && currentSong.value.videoId !== item.videoId) {
        return;
      } else {
        currentSong.value = item
      }
      ctx.root.$nextTick(() => {
        try {
          if(!player.value || !player.value.ready) {
            throw new Error('player not init/ready yet');
          }
          if (item.startTime) {
            console.log(`Setting start time to ${item.startTime}s`)
            player.value.forward(item.startTime);
          }

          player.value.volume = item.volume / 100;
          player.value.muted = true;
          ctx.root.$nextTick(() => {
            if (autoplay.value) {
              player.value.play();
            }
            player.value.muted = false;
          });
        } catch (e) {
          return setTimeout(() => {
            console.log('Retrying playThisSong')
            console.log('If song is not playing and you are on Chrome, disable adblockers or popup blockers - https://github.com/sampotts/plyr/issues/1538')
            playThisSong(item, retry++); //retry after while
          }, 1000)
        }
      });
    }

    onMounted(() => {
      refreshPlaylist();

      socket.on('videoID', (item: any) => {
        updateTime.value = Date.now(); // reset player
        playThisSong(item)
      })

      socket.on('isPlaying', (cb: (isPlaying: boolean) => void) => {
        if (player.value) {
          cb(player.value.playing);
        } else {
          cb(false);
        }
      })

      intervals.push(window.setInterval(() => {
        socket.emit('songs::getAllRequests', {}, (err: any, items: SongRequestInterface[]) => {
          if (!isEqual(requests.value, items)) {
            if (currentSong.value === null && autoplay.value) {
              next();
            }
          }
          requests.value = items
        })
      }, 1000));

      intervals.push(window.setInterval(() => {
        refreshPlaylist();
      }, 10000));
    })
    onUnmounted(() => {
      for(const interval of intervals) {
        clearInterval(interval);
      }
    })

    return {
      currentTag,
      availableTags,
      autoplay,
      waitingForNext,
      currentSong,
      requests,
      playerRef,
      updateTime,

      removeSongRequest,
      videoEnded,
      videoTimeUpdated,
      nextAndRemoveFromPlaylist,
      next,
      pause,
      play,
      formatTime,

      translate,
      EventBus,
    }
  }
})
</script>

<style scoped>
  .nav { flex-wrap: initial; }

  #yt-main { background-color: black; }
  .vcenter {
    position: relative;
    top: 50%;
    transform: translate(0, -50%);
  }

  .form .b-dropdown-form {
    padding:0 1rem 1rem;
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