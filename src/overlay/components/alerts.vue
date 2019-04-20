<template>
  <div>
      <pre class="debug" :class="[!urlParam('debug') ? 'hide' : '']">
isFinished: {{ isFinished }}
isPlaying: {{ isPlaying }}
current: {{ getCurrentAlertList() }}
finishedCount: {{ finishedCount }}
finished: {{ (getCurrentAlertList() || []).filter(o => o.finished) }}
      </pre>
      <div class="absolute" v-if="isPlaying && !isFinished">
        <transition
          v-for="(alert, index) of getCurrentAlertList()" :key="index"
          @enter="doEnterAnimation"
          @leave="doLeaveAnimation"
          :css="false"
        >
          <iframe
            :data-index="index"
            v-if="alert.type === 'html' && alert.run"
            v-show="alert.run && !alert.finished && !alert.leaveAnimation"
            :class="[ alert.class ? alert.class : '']"
            :src="alert.url"></iframe>

          <audio
            ref="audio"
            v-if="alert.type === 'audio'"
            :src="alert.url"></audio>

          <video
            preload="metadata"
            playsinline
            ref="video"
            :data-index="index"
            :data-src="alert.url"
            :class="[ alert.class ? alert.class : '']"
            :style="{ width: alert['size'], top: alert['y-offset'] ? alert['y-offset'] + 'px' : 'inherit', left: alert['x-offset'] ? alert['x-offset'] + 'px' : 'inherit' }"
            v-show="alert.run && alert.isLoaded && !alert.finished && !alert.leaveAnimation"
            v-if="alert.type === 'video' || alert.type === 'clip'">
            <source :src="alert.url + '#t=0.1'" type="video/mp4">
          </video>

          <div
            class='text'
            :data-index="index"
            :class="[ alert.class ? alert.class : '']"
            v-show="alert.run && !alert.finished && !alert.leaveAnimation"
            :style="{ top: alert['y-offset'] ? alert['y-offset'] + 'px' : 'inherit', left: alert['x-offset'] ? alert['x-offset'] + 'px' : 'inherit', 'text-align': alert.align || 'left' }"
            v-if="alert.type === 'text'">{{alert.text}}</div>

          <img
            class="image"
            :data-index="index"
            :class="[ alert.class ? alert.class : '']"
            v-show="alert.run && !alert.finished && !alert.leaveAnimation"
            v-if="alert.type === 'image'"
            :style="{ top: alert['y-offset'] ? alert['y-offset'] + 'px' : 'inherit', left: alert['x-offset'] ? alert['x-offset'] + 'px' : 'inherit' }"
            :src="alert.url"/>
        </transition>
    </div>
  </div>
</template>

<script>
import { TweenLite } from 'gsap/TweenMax'
import io from 'socket.io-client';

export default {
  props: ['token'],
  data: function () {
    return {
      socket: io('/overlays/alerts', {query: "token="+token}),
      isPlaying: false,
      alerts: []
    }
  },
  mounted: function () {
    this.socket.on('alert', data => {
      for (let d of data) {
        d.run = false
        d.isLoaded = false
        d.finished = false
        d.leaveAnimation = false
        d.receivedAt = Date.now()
      }
      this.alerts.push(data)
    })

    setInterval(() => {
      if (!this.isPlaying) {
        this.isPlaying = this.getCurrentAlertList() !== null
      } else {
        for (let a of this.getCurrentAlertList()) {
          if (a.run) continue

          a.delay = Number(a.delay)
          if (isNaN(a.delay)) a.delay = 0
          if (a.receivedAt + a.delay < Date.now()) a.run = true
          else continue

          if (a.type === 'audio') {
            if (!a.url) {
              a.finished = true
              continue
            }
            const audio = this.$refs.audio
            if (audio) {
              for (let el of audio) {
                if (el.src === a.url) {
                  if (a.volume) el.volume = Number(a.volume) / 100
                  if (!el.error) {
                    el.onended = () => a.finished = true
                    el.play()
                  } else {
                    a.finished = true
                    console.error('Something went wrong with your audio file')
                  }
                }
              }
            } else {
              a.run = false // we need to repeat if audio was not loaded yet
            }
          }

          if (a.type === 'video' || a.type === 'clip') {
            if (!a.url) {
              a.finished = true
              continue
            }
            const video = this.$refs.video
            if (video) {
              for (let el of video) {
                if (el.dataset.src === a.url) {
                  if (typeof a.size === 'undefined') a.size = '100%'
                  if (!el.error) {
                    el.onended = () => {
                      a.leaveAnimation = true // trigger leave animation
                      setTimeout(() => a.finished = true, Number(a.duration || 1000)) // trigger finished
                    }
                    setTimeout(() => {
                      // run even if oncanplaythrough wasn't triggered
                      if (!a.canBePlayed) {
                        if (!a.thumbnail) {
                          a.thumbnail = true
                          el.volume = 0
                          el.play()
                          setTimeout(() => {
                            el.pause()
                            setTimeout(() => {
                              if (a.volume) el.volume = Number(a.volume) / 100
                              a.isLoaded = true
                              el.play()
                            }, 1000)
                          }, 100)
                        }
                      }
                    }, 5000)
                    el.oncanplaythrough = () => {
                      a.canBePlayed = true
                      if (!a.thumbnail) {
                        a.thumbnail = true
                        el.volume = 0
                        el.play()
                        setTimeout(() => {
                          el.pause()
                          setTimeout(() => {
                            if (a.volume) el.volume = Number(a.volume) / 100
                            a.isLoaded = true
                            el.play()
                          }, 1000)
                        }, 100)
                      }
                    }
                  } else {
                    a.leaveAnimation = true // trigger leave animation
                    a.finished = true
                    console.error('Something went wrong with your video file')
                  }
                }
              }
            } else {
              a.run = false // we need to repeat if audio was not loaded yet
            }
          }

          if (!a.finished && !['audio', 'video', 'clip'].includes(a.type)) {
            setTimeout(() => a.leaveAnimation = true, Number(a.duration || 1000) + Number(a.time||1000)) // trigger leave animation
            setTimeout(() => a.finished = true, Number(a.duration || 1000) + Number(a.duration || 1000) + Number(a.time||1000)) // trigger finished
          }

        }
      }
    }, 100)
  },
  computed: {
    finishedCount: function () {
      if (this.getCurrentAlertList()) {
        return this.getCurrentAlertList().filter(o => o.finished).length
      } else return 0
    },
    isFinished: function () {
      if (this.getCurrentAlertList())
        return this.finishedCount === this.getCurrentAlertList().length
      else
        return true
    }
  },
  watch: {
    isFinished: function (val) {
      if (val) {
        this.isPlaying = false,
        this.alerts.shift()
        if (this.alerts[0]) {
          for (let a of this.alerts[0]) {
            a.receivedAt = Date.now()
          }
        }
      }
    }
  },
  methods: {
    urlParam: function (name) {
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results == null) {
        return null
      } else {
        return decodeURI(results[1]) || 0;
      }
    },
    doEnterAnimation: function (el, done) {
      TweenLite.to(el, (this.getCurrentAlertList()[el.dataset.index].duration || 1000) / 1000, {
        opacity: 1,
        onComplete: () => {
          done()
        }
      })
    },
    doLeaveAnimation: function (el, done) {
      TweenLite.to(el, (this.getCurrentAlertList()[el.dataset.index].duration || 1000) / 1000, {
        opacity: 0,
        onComplete: () => {
          done()
        }
      })
    },
    getCurrentAlertList: function () {
      return this.alerts.length > 0 ? this.alerts[0] : null
    },

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