<template>
  <div class="widget">
    <b-card
      class="border-0 h-100"
      no-body
    >
      <b-tabs
        class="h-100"
        pills
        card
        style="overflow:hidden"
        fill
        content-class="blackbg"
      >
        <template #tabs-start>
          <template v-if="!popout">
            <li
              v-if="!nodrag"
              class="nav-item px-2 grip text-secondary align-self-center shrink"
            >
              <fa
                icon="grip-vertical"
                fixed-width
              />
            </li>
          </template>
          <li class="nav-item shrink">
            <b-dropdown
              ref="dropdown"
              boundary="window"
              no-caret
              :text="translate('widget-title-ytplayer') + ' - ' + currentTag"
              variant="outline-primary"
              toggle-class="border-0"
            >
              <b-dropdown-form class="form">
                <label>Playlist</label>
                <b-select v-model="currentTag">
                  <b-form-select-option
                    v-for="tag of availableTags"
                    :key="tag"
                    :value="tag"
                  >
                    {{ tag }}
                  </b-form-select-option>
                </b-select>
              </b-dropdown-form>
              <b-dropdown-item @click="nextAndRemoveFromPlaylist">
                skip &amp; remove from playlist
              </b-dropdown-item>
              <template v-if="!popout">
                <b-dropdown-divider />
                <b-dropdown-item>
                  <a
                    class="text-danger"
                    href="#"
                    @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'ytplayer'))"
                    v-html="translate('remove-widget').replace('$name', translate('widget-title-ytplayer'))"
                  />
                </b-dropdown-item>
              </template>
            </b-dropdown>
          </li>
        </template>
        <b-tab title-item-class="shrink">
          <template #title>
            <small>{{ requests.length }} &nbsp;</small>
            <fa icon="list" />
          </template>
          <b-card-text>
            <b-table-simple small>
              <b-tr
                v-for="(request, index) of requests"
                :key="index"
              >
                <b-td style="vertical-align: middle">
                  {{ request.title }}
                </b-td>
                <b-td style="vertical-align: middle">
                  {{ request.username }}
                </b-td>
                <b-td style="vertical-align: middle">
                  {{ formatTime(request.length) }}
                </b-td>
                <b-td
                  style="vertical-align: middle"
                  class="text-right"
                >
                  <b-button
                    variant="outline-danger"
                    class="border-0"
                    @click="removeSongRequest(String(request.id))"
                  >
                    <fa
                      :icon="'times'"
                      fixed-width
                      small
                    />
                  </b-button>
                </b-td>
              </b-tr>
            </b-table-simple>
          </b-card-text>
        </b-tab>
        <b-tab
          active
          title-link-class="p-0 text-left overflow"
          title-item-class="widthmincontent"
        >
          <template #title>
            <b-button-group>
              <button
                v-if="!autoplay"
                class="btn nav-btn btn-success"
                @click="play"
              >
                <fa icon="play" />
              </button>
              <button
                v-else
                class="btn nav-btn btn-danger"
                @click="pause"
              >
                <fa icon="pause" />
              </button>
              <button
                class="btn nav-btn btn-secondary"
                @click="next"
              >
                <fa icon="forward" />
              </button>
            </b-button-group>
            <span
              class="align-self-center mx-2"
              style="position:relative; top: 2px;"
            >
              <fa
                v-if="autoplay"
                icon="play"
              />
              <fa
                v-else
                icon="pause"
              /></span>
          </template>
          <b-card-text class="vcenter">
            <div
              v-if="currentSong.videoId !== null"
              :key="JSON.stringify(currentSong)"
            >
              <vue-plyr
                ref="playerRef"
                :options="{ controls: ['volume', 'progress', 'current-time', 'restart', 'mute'], fullscreen: { enabled: false }, clickToPlay: false }"
                @timeupdate="videoTimeUpdated"
                @ended="videoEnded"
              >
                <div
                  data-plyr-provider="youtube"
                  :data-plyr-embed-id="currentSong.videoId"
                /> <!-- this is only needed for first init of player -->
              </vue-plyr>
            </div>
          </b-card-text>
        </b-tab>
      </b-tabs>
    </b-card>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, onMounted, onUnmounted, ref, watch,
} from '@vue/composition-api';
import { isEqual } from 'lodash-es';
import Vue from 'vue';
import VuePlyr from 'vue-plyr';
import 'vue-plyr/dist/vue-plyr.css';

import type { SongRequestInterface } from 'src/bot/database/entity/song';
import type { currentSongType } from 'src/bot/systems/songs';
import { error } from 'src/panel/helpers/error';
import { EventBus } from 'src/panel/helpers/event-bus';

Vue.use(VuePlyr, { plyr: {} });

type Props = {
  popout: boolean;
  nodrag: boolean;
};

const emptyCurrentSong = {
  videoId: null, title: '', type: '', username: '', volume: 0, loudness: 0, forceVolume: false, startTime: 0, endTime: Number.MAX_SAFE_INTEGER,
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
    const currentSong = ref(emptyCurrentSong as  currentSongType);
    const requests = ref([] as SongRequestInterface[]);
    const playerRef = ref(null as null | any);
    const player = computed(() => {
      return playerRef.value ? playerRef.value.player : null;
    });
    const updateTime = ref(Date.now());
    const intervals = [] as number[];

    watch(currentSong, () => {
      playThisSong(0);
    }, { deep: true });
    watch(currentTag, (val) => socket.emit('set.playlist.tag', val));
    watch(autoplay, async (val) => {
      await waitForPlayerReady();
      player.value.autoplay = val;
      if (!val) {
        player.value.pause();
      } else {
        player.value.play();
      }
    });

    const waitForPlayerReady = () => new Promise<void>(resolve => {
      const loop = () => {
        if (player.value && player.value.ready) {
          player.value.off('timeupdate');
          player.value.off('ended');
          player.value.on('timeupdate', (event: any) => videoTimeUpdated(event));
          player.value.on('ended', () => videoEnded());
          resolve();
        } else {
          setTimeout(() => loop(), 1000);
        }
      };
      loop();
    });

    const refreshPlaylist = () => {
      socket.emit('current.playlist.tag', (err: null, tag: string) => {
        currentTag.value = tag;
      });
      socket.emit('get.playlist.tags', (err: null, tags: string[]) => {
        availableTags.value = tags;
      });
    };

    const removeSongRequest = (id: string) => {
      if (confirm('Do you want to delete song request ' + requests.value.find(o => String(o.id) === id)?.title + ' from ' + requests.value.find(o => String(o.id) === id)?.username + '?')) {
        console.log('Removing => ' + id);
        requests.value = requests.value.filter((o) => String(o.id) !== id);
        socket.emit('songs::removeRequest', id, () => {
          return;
        });
      }
    };

    const videoEnded = () => {
      console.debug('[YTPLAYER.ended] - autoplay ', autoplay.value);
      if (autoplay.value) {
        next();
      }
    };

    const videoTimeUpdated = (event: any) => {
      if (autoplay.value && currentSong.value) {
        if (currentSong.value.endTime && event.detail.plyr.currentTime >= currentSong.value.endTime) {
          next(); // go to next if we are at endTime
        }
      }
    };

    const nextAndRemoveFromPlaylist = () => {
      if (currentSong.value) {
        socket.emit('delete.playlist', currentSong.value.videoId);
        next();
      }
    };

    const next = () => {
      currentSong.value = emptyCurrentSong;
      if (player.value) {
        player.value.pause();
      }
      socket.emit('next');
    };

    const pause = () => {
      autoplay.value = false;
    };

    const play = async () => {
      autoplay.value = true;
      if (currentSong.value.videoId === null) {
        socket.emit('next');
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
    };

    const playThisSong = async (retry = 0) => {
      if (retry > 10) {
        console.error('Time of retries exceeded to play this song.');
        return;
      }

      const waitForPlayer = () => new Promise<void>(resolve => {
        const loop = () => {
          if (playerRef.value) {
            resolve();
          } else {
            setTimeout(() => loop(), 1000);
          }
        };
        loop();
      });
      await waitForPlayer();

      ctx.root.$nextTick(async () => {
        try {
          // change only if something is changed
          if (!player.value.source || !player.value.source.includes(currentSong.value.videoId)) {
            player.value.source = {
              type:    'video',
              sources: [
                {
                  src:      currentSong.value.videoId,
                  provider: 'youtube',
                },
              ],
            };
          }
          await waitForPlayerReady();

          if (currentSong.value.startTime) {
            console.log(`Setting start time to ${currentSong.value.startTime}s`);
            player.value.forward(currentSong.value.startTime);
          }

          player.value.volume = currentSong.value.volume / 100;
          player.value.muted = true;
          ctx.root.$nextTick(async () => {
            player.value.muted = false;
          });
          player.value.play();
        } catch (e) {
          return setTimeout(() => {
            console.log('Retrying playThisSong');
            console.log('If song is not playing and you are on Chrome, disable adblockers or popup blockers - https://github.com/sampotts/plyr/issues/1538');
            console.error(e);
            playThisSong(retry++); //retry after while
          }, 1000);
        }
      });
    };

    onMounted(() => {
      refreshPlaylist();

      socket.on('isPlaying', (cb: (isPlaying: boolean) => void) => {
        if (player.value) {
          cb(player.value.playing);
        } else {
          cb(false);
        }
      });

      intervals.push(window.setInterval(() => {
        if (autoplay.value) {
          socket.emit('songs::currentSong', (err: null, botCurrentSong: currentSongType) => {
            if (!isEqual(currentSong.value, botCurrentSong)) {
              currentSong.value = botCurrentSong;
            }
          });
        }
        socket.emit('songs::getAllRequests', {}, (err: any, items: SongRequestInterface[]) => {
          if (err) {
            error(err);
          }
          if (currentSong.value.videoId === null && autoplay.value) {
            next();
          }
          requests.value = items;
        });
      }, 1000));

      intervals.push(window.setInterval(() => {
        refreshPlaylist();
      }, 10000));
    });
    onUnmounted(() => {
      for(const interval of intervals) {
        clearInterval(interval);
      }
    });

    return {
      currentTag,
      availableTags,
      autoplay,
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
    };
  },
});
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