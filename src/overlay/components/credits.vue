<template>
<div>
  <pre class="debug" v-if="urlParam('debug')">
<button @click="stopAnimation">Stop Animation</button>
settings: {{ settings }}
currentPage: {{ currentPage }}
clipsPages: {{ clipsPages }}
isLoaded: {{ isLoaded }}
isPlaying: {{ isPlaying }}
isEnded: {{ isEnded }}
current: {{ current }}
  </pre>
  <div ref="page" class="page">
    <template v-for="el of current">
      <video class="video" v-if="el.type === 'video'" playsinline ref="video" :key="el.index">
        <source :src="el.clip" type="video/mp4">
      </video>
      <div v-else-if="el.type ==='with-icon'" :key="el.index" class="text4" style="text-align: left; padding-left:5vw; padding-top: 0;">
        <font-awesome-icon :icon="['fab', el.class]" fixed-width />
        {{el.text}}
      </div>
      <img v-else-if="el.type === 'image'" :src="el.image" :class="el.class" :key="el.index" />
      <div v-else :class="el.class" :key="el.index" v-html="el.text"></div>
    </template>
  </div>
</div>
</template>

<script>
import { TweenLite, Power0, Sine } from 'gsap/TweenMax'
import io from 'socket.io-client';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faDeviantart, faDiscord, faFacebook, faGithub, faGoogle, faInstagram, faLinkedin, faPaypal, faPinterest, faPlaystation, faReddit, faSkype, faSnapchat, faSpotify, faSteam, faStrava, faTelegram, faTwitter, faVk, faWindows, faXbox, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faDeviantart, faDiscord, faFacebook, faGithub, faGoogle, faInstagram, faLinkedin, faPaypal, faPinterest, faPlaystation, faReddit, faSkype, faSnapchat, faSpotify, faSteam, faStrava, faTelegram, faTwitter, faVk, faWindows, faXbox, faYoutube)

export default {
  props: ['token'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  data: function () {
    return {
      socket: io('/overlays/credits', {
        query: "token=" + token
      }),
      settings: {},
      pages: [],
      clipsPages: [],
      currentPage: 0,
      isLoaded: false,
      isPlaying: false,
      isEnded: false
    }
  },
  mounted: function () {
    this.socket.emit('load', (err, opts) => {
      this.settings = opts.settings

      // set speed
      if (opts.settings.speed === 'very slow') this.settings.speed = 50
      if (opts.settings.speed === 'slow') this.settings.speed = 25
      if (opts.settings.speed === 'medium') this.settings.speed = 15
      if (opts.settings.speed === 'fast') this.settings.speed = 5
      if (opts.settings.speed === 'very fast') this.settings.speed = 2

      // set page 1 -> title, game, text
      this.pages.push([
        {
          text: opts.game.value,
          class: "game",
          index: Math.random()
        },
        {
          text: opts.title.value,
          class: "title",
          index: Math.random()
        },
        {
          text: opts.settings.text.streamBy,
          class: "header3",
          index: Math.random()
        },
        {
          text: opts.streamer,
          class: "streamer",
          index: Math.random()
        },
        {
          text: '',
          class: "separator",
          index: Math.random()
        },
        {
          image: 'https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(opts.game.value) + '-600x840.jpg',
          type: 'image',
          class: 'image',
          index: Math.random()
        }
      ])

      let currentKey = ''
      let page = []
      let withoutPadding = true
      for (let [key, object] of Object.entries(_.groupBy(opts.events, 'event'))) {
        if (!opts.settings.show[key]) continue
        if (key !== currentKey) {
          currentKey = key
          page.push({
            text: opts.settings.text[key],
            class: withoutPadding ? "header1 withoutPadding" : "header1",
            index: Math.random()
          })
          withoutPadding = false
        }

        const groupByUsername = Object.entries(_.groupBy(object, 'username'))
        for (let [username, o] of groupByUsername) {
          let html = username
          if (key === 'cheer') {
            html = `<strong style="font-size:65%">${o.reduce((a, b) => ({ bits: Number(a.bits) + Number(b.bits) })).bits} bits</strong> <br> ${username}`
          } else if (['raid', 'host'].includes(key)) {
            html = `<strong style="font-size:65%">${o.reduce((a, b) => ({ viewers: Number(a.viewers) + Number(b.viewers) })).viewers} viewers</strong> <br> ${username}`
          } else if (['resub'].includes(key)) {
            html = `<strong style="font-size:65%">${o[0].months} months</strong> <br> ${username}`
          } else if (['tip'].includes(key)) {
            html = `<strong style="font-size:65%">${Number(o.reduce((a, b) => ({ amount: Number(a.amount) + Number(b.amount) })).amount).toFixed(2)} ${o[0].currency}</strong> <br> ${username}`
          }
          page.push({
            text: html,
            class: "text4 column",
            index: Math.random()
          })
        }
        for (let i = 0; i < 3 - (groupByUsername.length % 3); i++) {
          page.push({
            text: '',
            class: "text4 column",
            index: Math.random()
          })
        }
      }
      if (page.length > 0) this.pages.push(page)

      // clips
      for (let i = 0, length = opts.clips.length; i < length; i++) {
        this.clipsPages.push(this.pages.length)

        const clip = opts.clips[i]
        this.pages.push([
          {
            text: clip.game,
            class: "clip_game",
            index: Math.random()
          },
          {
            text: clip.title,
            class: "clip_title",
            index: Math.random()
          },
          {
            text: clip.creator_name,
            class: "clip_createdBy",
            index: Math.random()
          },
          {
            text: i + 1,
            class: "clip_index",
            index: Math.random()
          },
          {
            clip: clip.mp4,
            class: "clip_video",
            type: "video",
            index: Math.random()
          }
        ])
      }

      // custom texts
      if (opts.customTexts.length > 0) {
        page = []
        for (let ct of opts.customTexts) {
          var cl = "header2"
          if (ct.type === 'header') cl = "header3"
          if (ct.type === 'text') cl = "text3"
          if (ct.type === 'smallText') cl = "text4"
          if (ct.type === 'separator') {
            cl = "separator"
            ct.left = ''
            ct.right = ''
            ct.middle = ''
          }

          page.push({
            text: ct.left,
            class: cl + ' column',
            index: Math.random()
          })
          page.push({
            text: ct.middle,
            class: cl + ' column',
            index: Math.random()
          })
          page.push({
            text: ct.right,
            class: cl + ' column',
            index: Math.random()
          })
        }
        if (page.length > 0) this.pages.push(page)
      }

      // last page is lastMessage and lastSubMessage
      let social = []
      for (let s of opts.social) {
        social.push({
          text: s.text,
          type: 'with-icon',
          class: s.type,
          index: Math.random()
        })
      }

      this.pages.push([
        {
          text: opts.settings.text.lastMessage,
          class: "header1",
          index: Math.random()
        }, {
          text: opts.settings.text.lastSubMessage,
          class: "text2",
          index: Math.random()
        },
        {
          text: '',
          class: "separator",
          index: Math.random()
        },
        ...social
      ])

      this.isLoaded = true
    })
  },
  computed: {
    current: function () {
      return this.pages[this.currentPage]
    }
  },
  watch: {
    isEnded: function (val) {
      if (val) {
        if (this.pages[this.currentPage + 1]) {
          this.$refs.page.style.top = window.innerHeight + 'px'
          this.isEnded = false
          this.isPlaying = false
          this.currentPage++
        }
      }
    },
    isLoaded: function () {
      setInterval(() => {
        if (!this.isPlaying) {
          if (this.$refs.page.clientHeight === 0) return
          this.$refs.page.style.top = window.innerHeight + 'px'

          this.$nextTick(() => { // force next tick
            this.isPlaying = true
            // normal linear if non clips
            if (!this.clipsPages.includes(this.currentPage)) {
              // set endPos to 0 if last page (so we see last page)
              const endPos = this.pages[this.currentPage + 1] ? -(this.$refs.page.clientHeight + 100) : 0
              const duration = (window.innerHeight + (-endPos)) * this.settings.speed
              TweenLite.to(this.$refs.page, duration / 1000, {
                top: endPos,
                ease: endPos === 0 ? Sine.easeOut : Power0.easeNone,
                onComplete: () => {
                  this.isEnded = true
                }
              })
            } else {
              // clip page
              const duration1 = window.innerHeight * this.settings.speed
              const duration2 = (this.$refs.page.clientHeight + 100) * this.settings.speed
              TweenLite.to(this.$refs.page, duration1 / 1000, {
                top: 0,
                ease: Sine.easeOut,
                onComplete: () => {
                  // play clip
                  const video = this.$refs.video[0]
                  video.volume = this.settings.clips.volume / 100

                  if (this.settings.clips.shouldPlay) {
                    video.play()
                    video.onended = () => {
                      TweenLite.to(this.$refs.page, duration2 / 1000, {
                        top: -(this.$refs.page.clientHeight + 100),
                        ease: Sine.easeIn,
                        onComplete: () => {
                          this.isEnded = true
                        }
                      })
                    }
                  } else {
                    TweenLite.to(this.$refs.page, duration2 / 1000, {
                      top: -(this.$refs.page.clientHeight + 100),
                      ease: Power0.easeNone,
                      onComplete: () => {
                        this.isEnded = true
                      }
                    })
                  }
                }
              })
            }
          })
        }
      }, 10)
    }
  },
  methods: {
    stopAnimation: function () {
      TweenMax.killAll()
    },
    urlParam: function (name) {
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results == null) {
        return null
      } else {
        return decodeURI(results[1]) || 0;
      }
    }
  }
}
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css?family=Cabin+Condensed');

  .debug {
    z-index: 9999;
    background-color: rgba(0, 0, 0, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }

  svg {
    filter: drop-shadow( -0px -0px .2rem #000 );
  }

  div.page {
    font-family: 'Cabin Condensed', sans-serif;
    text-align: center;
    text-transform: uppercase;
    color: #fff;
    position: relative;
    text-shadow: 0 0 1rem #000;
    top: -9999px;
    margin: 5vh;
    text-align: center;
  }

  .streamer {
    font-size: 2vw
  }

  .game {
    font-size: 4vw
  }

  .title {
    font-size: 2.5vw
  }

  .column {
    display: inline-block;
    width: 33%;
  }

  .text4 {
    padding-top: 2vw;
    font-size: 2vw;
  }

  .text3 {
    padding-top: 2vw;
    font-size: 2.5vw;
  }

  .text2 {
    padding-top: 2vw;
    font-size: 3vw;
  }

  .text1 {
    padding-top: 2vw;
    font-size: 3.5vw;
  }

  .image {
    width: 30vw;
  }

  .header3 {
    padding-top: 2vw;
    font-size: 2.5vw;
    font-weight: bold;
  }

  .header2 {
    padding-top: 2vw;
    font-size: 3vw;
    font-weight: bold;
  }

  .withoutPadding {
    padding-top: 0 !important;
  }

  .separator {
    padding-top: 10vw;
  }

  .header1 {
    padding-top: 10vw;
    font-size: 3.5vw;
    font-weight: bold;
  }

  .clip_title, .clip_game, .clip_createdBy {
    text-align: left;
    font-size: 3vw;
  }
  .clip_createdBy {
    font-size: 2.5vw
  }
  .clip_game {
    font-weight: bold;
  }
  .clip_index {
    font-size: 10vw;
    position: absolute;
    right: 2.5vw;
    top: 0;
  }
  .video {
    width: 100%;
    padding-top: 8vh;
    max-height: 65vh;
  }
</style>