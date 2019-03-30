<template>
<div>
  <div ref="label" class="label" v-if="isPlaying" v-show="getPlayingSettings().label">
    <font-awesome-icon icon="circle" class="pr-1" style="font-size: 2vw" />
    CLIP
  </div>
  <transition name="fade">
    <video playsinline v-show="isPlaying" v-if="getPlayingClip()" ref="video" autoplay="true" :class="['filter-' + getPlayingSettings().filter]">
      <source :src="getPlayingClip().mp4" type="video/mp4">
    </video>
  </transition>
</div>
</template>

<script>
import { TweenMax } from 'gsap/TweenMax'
import io from 'socket.io-client';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faCircle)

export default {
  props: ['token'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  data: function () {
    return {
      socket: io('/overlays/clips', {
        query: "token=" + token
      }),
      isPlaying: false,
      clips: [],
      settings: []
    }
  },
  created: function () {
    this.socket.on('clips', data => {
      for (let i = 0, len = data.clips.length; i < len; i++) {
        this.settings.push(data.settings)
        this.clips.push(data.clips[i])
      }
    })

    setInterval(() => {
      const video = this.$refs['video']
      if (typeof video !== 'undefined' && video.ended) {
        this.isPlaying = false
        this.clips.shift()
        this.settings.shift()
      }

      if (!this.isPlaying) {
        this.isPlaying = this.getPlayingClip() !== null
      }
    }, 100)
  },
  watch: {
    isPlaying: function (val) {
      if (val) {
        const video = this.$refs['video']
        video.volume = this.getPlayingSettings().volume / 100
        video.play()

        this.$nextTick(function () {
          if (this.getPlayingSettings().label && this.$refs['label']) TweenMax.fromTo(this.$refs['label'], 1, { opacity: 0 }, { opacity: 1, yoyo: true, repeat:-1} )
        })
      }
    }
  },
  methods: {
    getPlayingClip: function () {
      return this.clips.length > 0 ? this.clips[0] : null
    },
    getPlayingSettings: function () {
      return this.settings.length > 0 ? this.settings[0] : null
    }
  }
}
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css?family=Cabin');

  .fade-enter-active, .fade-leave-active {
    transition: opacity 2s;
  }
  .fade-enter, .fade-leave-to {
    opacity: 0;
  }
  video { width: 100%; }

  .label {
    z-index: 9999999999;
    font-family: 'Cabin';
    font-size: 3vw;
    color: red;
    position: absolute;
    right: 1%; top: 1%;
    font-weight: bold;
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  }

  /* filters */
  .filter-grayscale {
    -webkit-filter: grayscale(1);
    filter: grayscale(1);
  }
  .filter-sepia {
    -webkit-filter: sepia(1);
    filter: sepia(1);
  }
  .filter-tint {
    -webkit-filter: sepia(1) hue-rotate(200deg);
    filter: sepia(1) hue-rotate(200deg);
  }
  .filter-washed {
    -webkit-filter: contrast(1.4) saturate(1.8) sepia(.6);
    filter: contrast(1.4) saturate(1.8) sepia(.6);
  }
</style>
