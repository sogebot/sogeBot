<template>
  <div>
    <pre
      v-if="urlParam('debug')"
      class="debug"
    >
settings: {{ settings }}
currentPage: {{ currentPage }}
clipsPages: {{ clipsPages }}
isLoaded: {{ isLoaded }}
isPlaying: {{ isPlaying }}
isEnded: {{ isEnded }}
current: {{ current }}
  </pre>
    <div
      ref="page"
      class="page"
    >
      <template v-for="el of current">
        <video
          v-if="el.type === 'video'"
          ref="video"
          :key="el.index"
          class="video"
          playsinline
        >
          <source
            :src="el.clip"
            type="video/mp4"
          >
        </video>
        <div
          v-else-if="el.type ==='with-icon'"
          :key="el.index"
          class="text4"
          style="text-align: left; padding-left:5vw; padding-top: 0;"
        >
          <font-awesome-icon
            :icon="['fab', el.class]"
            fixed-width
          />
          {{ el.text }}
        </div>
        <img
          v-else-if="el.type === 'image'"
          :key="el.index"
          :src="el.image"
          :class="el.class"
        >
        <div
          v-else
          :key="el.index"
          :class="el.class"
          v-html="el.text"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">

import { library } from '@fortawesome/fontawesome-svg-core';
import { faDeviantart } from '@fortawesome/free-brands-svg-icons/faDeviantart';
import { faDiscord } from '@fortawesome/free-brands-svg-icons/faDiscord';
import { faFacebook } from '@fortawesome/free-brands-svg-icons/faFacebook';
import { faGithub } from '@fortawesome/free-brands-svg-icons/faGithub';
import { faGoogle } from '@fortawesome/free-brands-svg-icons/faGoogle';
import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons/faLinkedin';
import { faPaypal } from '@fortawesome/free-brands-svg-icons/faPaypal';
import { faPinterest } from '@fortawesome/free-brands-svg-icons/faPinterest';
import { faPlaystation } from '@fortawesome/free-brands-svg-icons/faPlaystation';
import { faReddit } from '@fortawesome/free-brands-svg-icons/faReddit';
import { faSkype } from '@fortawesome/free-brands-svg-icons/faSkype';
import { faSnapchat } from '@fortawesome/free-brands-svg-icons/faSnapchat';
import { faSpotify } from '@fortawesome/free-brands-svg-icons/faSpotify';
import { faSteam } from '@fortawesome/free-brands-svg-icons/faSteam';
import { faStrava } from '@fortawesome/free-brands-svg-icons/faStrava';
import { faTelegram } from '@fortawesome/free-brands-svg-icons/faTelegram';
import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
import { faVk } from '@fortawesome/free-brands-svg-icons/faVk';
import { faWindows } from '@fortawesome/free-brands-svg-icons/faWindows';
import { faXbox } from '@fortawesome/free-brands-svg-icons/faXbox';
import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { getSocket } from '@sogebot/ui-helpers/socket';
import gsap from 'gsap';
import { groupBy } from 'lodash-es';
import {
  Component, Vue, Watch,
} from 'vue-property-decorator';

library.add(faDeviantart, faDiscord, faFacebook, faGithub, faGoogle, faInstagram, faLinkedin, faPaypal, faPinterest, faPlaystation, faReddit, faSkype, faSnapchat, faSpotify, faSteam, faStrava, faTelegram, faTwitter, faVk, faWindows, faXbox, faYoutube);

@Component({ components: { 'font-awesome-icon': FontAwesomeIcon } })
export default class CreditsOverlay extends Vue {
  socket = getSocket('/overlays/credits', true);
  settings: any = {};
  pages: any[] = [];
  clipsPages: any[] = [];
  currentPage = 0;
  isLoaded = false;
  isPlaying = false;
  isEnded = false;

  mounted () {
    this.socket.emit('load', async (err: string | null, opts: any) => {
      this.settings = opts.settings;

      // set speed
      if (opts.settings.speed === 'very slow') {
        this.settings.speed = 50;
      }
      if (opts.settings.speed === 'slow') {
        this.settings.speed = 25;
      }
      if (opts.settings.speed === 'medium') {
        this.settings.speed = 15;
      }
      if (opts.settings.speed === 'fast') {
        this.settings.speed = 5;
      }
      if (opts.settings.speed === 'very fast') {
        this.settings.speed = 2;
      }

      // set page 1 -> title, game, text
      this.pages.push([
        {
          text:  opts.game,
          class: 'game',
          index: Math.random(),
        },
        {
          text:  opts.title,
          class: 'title',
          index: Math.random(),
        },
        {
          text:  opts.settings.text.streamBy,
          class: 'header3',
          index: Math.random(),
        },
        {
          text:  opts.streamer,
          class: 'streamer',
          index: Math.random(),
        },
        {
          text:  '',
          class: 'separator',
          index: Math.random(),
        },
        {
          image: 'https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(opts.game) + '-600x840.jpg',
          type:  'image',
          class: 'image',
          index: Math.random(),
        },
      ]);

      // preload ttv-boxart
      await new Promise((resolve) => {
        fetch('https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(opts.game) + '-600x840.jpg')
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.blob();
          })
          .then(myBlob => {
            console.debug('ttv-boxart loaded');
            resolve(true);
          })
          .catch(error => {
            console.error(`ttv-boxart not loaded`);
          });
      });

      let currentKey = '';
      let page: any = [];
      let withoutPadding = true;
      for (const [key, object] of Object.entries(groupBy(opts.events, 'event'))) {
        if (!opts.settings.show[key]) {
          continue;
        }
        if (key !== currentKey) {
          currentKey = key;
          page.push({
            text:  opts.settings.text[key],
            class: withoutPadding ? 'header1 withoutPadding' : 'header1',
            index: Math.random(),
          });
          withoutPadding = false;
        }

        const groupByUsername = Object.entries(groupBy(object, 'username'));
        for (const [username, o] of groupByUsername) {
          let html = username;
          if (key === 'cheer') {
            html = `<strong style="font-size:65%">${o.reduce((a, b) => a + Number(b.values.bits), 0)} bits</strong> <br> ${username}`;
          } else if (['raid', 'host'].includes(key)) {
            html = `<strong style="font-size:65%">${o.reduce((a, b) => a + Number(b.values.viewers), 0)} viewers</strong> <br> ${username}`;
          } else if (['resub'].includes(key)) {
            html = `<strong style="font-size:65%">${o[0].values.subCumulativeMonths} months</strong> <br> ${username}`;
          } else if (['tip'].includes(key)) {
            html = `<strong style="font-size:65%">${Intl.NumberFormat(this.$store.state.configuration.lang, { style: 'currency', currency: o[0].values.currency }).format(Number(o.reduce((a, b) => a + Number(b.values.amount), 0)))}</strong> <br> ${username}`;
          }
          page.push({
            text:  html,
            class: 'text4 column',
            index: Math.random(),
          });
        }
        for (let i = 0; i < 3 - (groupByUsername.length % 3); i++) {
          page.push({
            text:  '',
            class: 'text4 column',
            index: Math.random(),
          });
        }
      }
      if (page.length > 0) {
        this.pages.push(page);
      }

      // clips
      for (let i = 0, length = opts.clips.length; i < length; i++) {
        this.clipsPages.push(this.pages.length);

        const clip = opts.clips[i];
        this.pages.push([
          {
            text:  clip.game,
            class: 'clip_game',
            index: Math.random(),
          },
          {
            text:  clip.title,
            class: 'clip_title',
            index: Math.random(),
          },
          {
            text:  clip.creator_name,
            class: 'clip_createdBy',
            index: Math.random(),
          },
          {
            text:  i + 1,
            class: 'clip_index',
            index: Math.random(),
          },
          {
            clip:  clip.mp4,
            class: 'clip_video',
            type:  'video',
            index: Math.random(),
          },
        ]);
      }

      // custom texts
      if (opts.customTexts.length > 0) {
        page = [];
        for (const ct of opts.customTexts) {
          let cl = 'header2';
          if (ct.type === 'header') {
            cl = 'header3';
          }
          if (ct.type === 'text') {
            cl = 'text3';
          }
          if (ct.type === 'smallText') {
            cl = 'text4';
          }
          if (ct.type === 'separator') {
            cl = 'separator';
            ct.left = '';
            ct.right = '';
            ct.middle = '';
          }

          page.push({
            text:  ct.left,
            class: cl + ' column',
            index: Math.random(),
          });
          page.push({
            text:  ct.middle,
            class: cl + ' column',
            index: Math.random(),
          });
          page.push({
            text:  ct.right,
            class: cl + ' column',
            index: Math.random(),
          });
        }
        if (page.length > 0) {
          this.pages.push(page);
        }
      }

      // last page is lastMessage and lastSubMessage
      const social: any = [];
      for (const s of opts.social) {
        social.push({
          text:  s.text,
          type:  'with-icon',
          class: s.type,
          index: Math.random(),
        });
      }

      this.pages.push([
        {
          text:  opts.settings.text.lastMessage,
          class: 'header1',
          index: Math.random(),
        }, {
          text:  opts.settings.text.lastSubMessage,
          class: 'text2',
          index: Math.random(),
        },
        {
          text:  '',
          class: 'separator',
          index: Math.random(),
        },
        ...social,
      ]);

      this.isLoaded = true;
    });
  }

  get current () {
    return this.pages[this.currentPage];
  }

  @Watch('isEnded')
  isEndedWatcher (val: boolean) {
    if (val) {
      if (this.pages[this.currentPage + 1]) {
        (this.$refs.page as HTMLElement).style.top = window.innerHeight + 'px';
        this.isEnded = false;
        this.isPlaying = false;
        this.currentPage++;
      }
    }
  }

  @Watch('isLoaded')
  isLoadedWatcher () {
    setInterval(() => {
      if (!this.isPlaying) {
        if ((this.$refs.page as HTMLElement).clientHeight === 0) {
          return;
        }
        (this.$refs.page as HTMLElement).style.top = window.innerHeight + 'px';

        this.$nextTick(() => { // force next tick
          this.isPlaying = true;
          // normal linear if non clips
          if (!this.clipsPages.includes(this.currentPage)) {
            // set endPos to 0 if last page (so we see last page)
            const endPos = this.pages[this.currentPage + 1] ? -((this.$refs.page as HTMLElement).clientHeight + 100) : 0;
            const duration = (window.innerHeight + (-endPos)) * this.settings.speed;
            gsap.to((this.$refs.page as HTMLElement), duration / 1000, {
              top:        endPos,
              ease:       endPos === 0 ? 'sine.out' : 'none',
              onComplete: () => {
                this.isEnded = true;
              },
            });
          } else {
            // clip page
            const duration1 = window.innerHeight * this.settings.speed;
            const duration2 = ((this.$refs.page as HTMLElement).clientHeight + 100) * this.settings.speed;
            gsap.to((this.$refs.page as HTMLElement), duration1 / 1000, {
              top:        0,
              ease:       'sine.out',
              onComplete: () => {
                // play clip
                const video = (this.$refs.video as HTMLAudioElement[])[0];
                video.volume = this.settings.clips.volume / 100;

                if (this.settings.clips.shouldPlay) {
                  video.play();
                  video.onended = () => {
                    gsap.to((this.$refs.page as HTMLElement), duration2 / 1000, {
                      top:        -((this.$refs.page as HTMLElement).clientHeight + 100),
                      ease:       'sine.in',
                      onComplete: () => {
                        this.isEnded = true;
                      },
                    });
                  };
                } else {
                  gsap.to((this.$refs.page as HTMLElement), duration2 / 1000, {
                    top:        -((this.$refs.page as HTMLElement).clientHeight + 100),
                    ease:       'none',
                    onComplete: () => {
                      this.isEnded = true;
                    },
                  });
                }
              },
            });
          }
        });
      }
    }, 1000);
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