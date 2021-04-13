<template>
  <div>
    <pre
      class="debug"
      :class="[!urlParam('debug') ? 'hide' : '']"
    >
isFinished: {{ isFinished }}
isPlaying: {{ isPlaying }}
current: {{ getCurrentAlertList() }}
finishedCount: {{ finishedCount }}
finished: {{ (getCurrentAlertList() || []).filter(o => o.finished) }}
      </pre>
    <div
      v-if="isPlaying && !isFinished"
      class="absolute"
    >
      <transition
        v-for="(alert, index) of getCurrentAlertList()"
        :key="index"
        :css="false"
        @enter="doEnterAnimation"
        @leave="doLeaveAnimation"
      >
        <iframe
          v-if="alert.type === 'html' && alert.run"
          v-show="alert.run && !alert.finished && !alert.leaveAnimation"
          :data-index="index"
          :class="[ alert.class ? alert.class : '']"
          :src="alert.url"
        />

        <audio
          v-if="alert.type === 'audio'"
          ref="audio"
          :src="alert.url"
        />

        <video
          v-show="alert.run && alert.isLoaded && !alert.finished && !alert.leaveAnimation"
          v-if="alert.type === 'video' || alert.type === 'clip'"
          ref="video"
          preload="metadata"
          playsinline
          :data-index="index"
          :data-src="alert.url"
          :class="[ alert.class ? alert.class : '']"
          :style="{ width: alert['size'], top: alert['y-offset'] ? alert['y-offset'] + 'px' : 'inherit', left: alert['x-offset'] ? alert['x-offset'] + 'px' : 'inherit' }"
        >
          <source
            :src="alert.url + '#t=0.1'"
            type="video/mp4"
          >
        </video>

        <div
          v-show="alert.run && !alert.finished && !alert.leaveAnimation"
          v-if="alert.type === 'text'"
          class="text"
          :data-index="index"
          :class="[ alert.class ? alert.class : '']"
          :style="{ top: alert['y-offset'] ? alert['y-offset'] + 'px' : 'inherit', left: alert['x-offset'] ? alert['x-offset'] + 'px' : 'inherit', 'text-align': alert.align || 'left' }"
        >
          {{ alert.text }}
        </div>

        <img
          v-show="alert.run && !alert.finished && !alert.leaveAnimation"
          v-if="alert.type === 'image'"
          class="image"
          :data-index="index"
          :class="[ alert.class ? alert.class : '']"
          :style="{ top: alert['y-offset'] ? alert['y-offset'] + 'px' : 'inherit', left: alert['x-offset'] ? alert['x-offset'] + 'px' : 'inherit' }"
          :src="alert.url"
        >
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import gsap from 'gsap';
import {
  Component, Vue, Watch,
} from 'vue-property-decorator';

@Component({})
export default class AlertsOverlay extends Vue {
  socket = getSocket('/overlays/alerts', true);
  isPlaying = false;
  alerts: any[] = [];
  interval: any[] = [];

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  mounted () {
    this.socket.emit('cache', async (err: string | null, data: any) => {
      if (err) {
        return console.error(err);
      }
      for (const galleryItem of data) {
        await fetch(new Request('/gallery/' + galleryItem, { cache: 'default' }));
        console.log('/gallery/' + galleryItem + ' loaded.');
      }
    });
    this.socket.on('alert', (data: any) => {
      for (const d of data) {
        d.run = false;
        d.isLoaded = false;
        d.finished = false;
        d.leaveAnimation = false;
        d.receivedAt = Date.now();
      }
      this.alerts.push(data);
    });

    this.interval.push(setInterval(() => {
      try {
        if (!this.isPlaying) {
          this.isPlaying = this.getCurrentAlertList() !== null;
        } else {
          for (const a of this.getCurrentAlertList()) {
            if (a.run) {
              continue;
            }

            a.delay = Number(a.delay);
            if (isNaN(a.delay)) {
              a.delay = 0;
            }
            if (a.receivedAt + a.delay < Date.now()) {
              a.run = true;
            } else {
              continue;
            }

            if (a.type === 'audio') {
              if (!a.url) {
                a.finished = true;
                continue;
              }
              const audio = this.$refs.audio as HTMLMediaElement[];
              if (audio) {
                for (const el of audio) {
                  if (el.src === a.url) {
                    if (a.volume) {
                      el.volume = Number(a.volume) / 100;
                    }
                    if (!el.error) {
                      el.onended = () => a.finished = true;
                      console.log('playing');
                      el.play().catch((err) => {
                        if (err) {
                          console.error('Something went wrong with your audio file');
                          console.error(err.message);
                          if ((a.url.startsWith('https://') && window.location.protocol.startsWith('http:'))
                              || (a.url.startsWith('http://') && window.location.protocol.startsWith('https:'))) {
                            console.error('You are using mixed content https + http');
                          }
                          a.finished = true;
                        }
                      });
                      //el.play()
                    } else {
                      a.finished = true;
                      console.error('Something went wrong with your audio file');
                    }
                  }
                }
              } else {
                a.run = false; // we need to repeat if audio was not loaded yet
              }
            }

            if (a.type === 'video' || a.type === 'clip') {
              if (!a.url) {
                a.finished = true;
                continue;
              }
              const video = this.$refs.video as HTMLMediaElement[];
              if (video) {
                for (const el of video) {
                  if (el.dataset.src === a.url) {
                    if (typeof a.size === 'undefined') {
                      a.size = '100%';
                    }
                    if (!el.error) {
                      el.onended = () => {
                        a.leaveAnimation = true; // trigger leave animation
                        setTimeout(() => a.finished = true, Number(a.duration || 1000)); // trigger finished
                      };
                      setTimeout(() => {
                        // run even if oncanplaythrough wasn't triggered
                        if (!a.canBePlayed) {
                          if (!a.thumbnail) {
                            a.thumbnail = true;
                            el.volume = 0;
                            el.play().catch((err) => {
                              if (err) {
                                console.error('Something went wrong with your video file');
                                console.error(err.message);
                                if ((a.url.startsWith('https://') && window.location.protocol.startsWith('http:'))
                                    || (a.url.startsWith('http://') && window.location.protocol.startsWith('https:'))) {
                                  console.error('You are using mixed content https + http');
                                }
                                a.finished = true;
                              }
                            });
                            setTimeout(() => {
                              el.pause();
                              setTimeout(() => {
                                if (a.volume) {
                                  el.volume = Number(a.volume) / 100;
                                }
                                a.isLoaded = true;
                                el.play().catch((err) => {
                                  if (err) {
                                    console.error('Something went wrong with your video file');
                                    console.error(err.message);
                                    if ((a.url.startsWith('https://') && window.location.protocol.startsWith('http:'))
                                        || (a.url.startsWith('http://') && window.location.protocol.startsWith('https:'))) {
                                      console.error('You are using mixed content https + http');
                                    }
                                    a.finished = true;
                                  }
                                });
                              }, 1000);
                            }, 100);
                          }
                        }
                      }, 5000);
                      el.oncanplaythrough = () => {
                        a.canBePlayed = true;
                        if (!a.thumbnail) {
                          a.thumbnail = true;
                          el.volume = 0;
                          el.play()
                            .catch((err) => {
                              if (err) {
                                console.error('Something went wrong with your video file');
                                console.error(err.message);
                                if ((a.url.startsWith('https://') && window.location.protocol.startsWith('http:'))
                                      || (a.url.startsWith('http://') && window.location.protocol.startsWith('https:'))) {
                                  console.error('You are using mixed content https + http');
                                }
                                a.finished = true;
                              }
                            }).then(() => {
                              setTimeout(() => {
                                el.pause();
                                setTimeout(() => {
                                  if (a.volume) {
                                    el.volume = Number(a.volume) / 100;
                                  }
                                  a.isLoaded = true;
                                  el.play();
                                  console.log('Playing video ' + el.dataset.src);
                                }, 1000);
                              }, 150);
                            });
                        }
                      };
                    } else {
                      a.leaveAnimation = true; // trigger leave animation
                      a.finished = true;
                      console.error('Something went wrong with your video file');
                      console.error(el.error);
                    }
                  }
                }
              } else {
                a.run = false; // we need to repeat if audio was not loaded yet
              }
            }

            if (!a.finished && !['audio', 'video', 'clip'].includes(a.type)) {
              setTimeout(() => a.leaveAnimation = true, Number(a.duration || 1000) + Number(a.time||1000)); // trigger leave animation
              setTimeout(() => a.finished = true, Number(a.duration || 1000) + Number(a.duration || 1000) + Number(a.time||1000)); // trigger finished
            }

          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 100));
  }

  get finishedCount () {
    if (this.getCurrentAlertList()) {
      return this.getCurrentAlertList().filter((o: any) => o.finished).length;
    } else {
      return 0;
    }
  }

  get isFinished () {
    if (this.getCurrentAlertList()) {
      return this.finishedCount === this.getCurrentAlertList().length;
    } else {
      return true;
    }
  }

  @Watch('isFinished')
  isFinishedWatch (val: boolean) {
    if (val) {
      this.isPlaying = false,
      this.alerts.shift();
      if (this.alerts[0]) {
        for (const a of this.alerts[0]) {
          a.receivedAt = Date.now();
        }
      }
    }
  }

  doEnterAnimation (el: HTMLElement, done: () => void) {
    gsap.to(el, {
      duration:   (this.getCurrentAlertList()[el.dataset.index || 0].duration || 1000) / 1000,
      opacity:    1,
      onComplete: () => {
        done();
      },
    });
  }

  doLeaveAnimation (el: HTMLElement, done: () => void) {
    gsap.to(el, {
      duration:   (this.getCurrentAlertList()[el.dataset.index || 0].duration || 1000) / 1000,
      opacity:    0,
      onComplete: () => {
        done();
      },
    });
  }

  getCurrentAlertList () {
    return this.alerts.length > 0 ? this.alerts[0] : null;
  }
}
</script>

<style scoped>
  .debug {
    z-index: 9999;
    background-color: rgba(0, 0, 0, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }

  .hide {
    display: none;
  }

  .absolute {
    position: absolute;
    width: 100%;
    height: 100%;
    display: table;
  }

  iframe, audio, video, .text, img {
    opacity: 0;
    position: relative;
  }

  video {
    background: transparent;
  }

  iframe, video {
    border: 0;
    width: 100%;
    height: 100%;
  }
  .fade-enter-active, .fade-leave-active {
    transition: opacity 2s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
</style>