<template>
<div ref="carousel" style="width: 99999999999%; position: absolute;">
  <template v-for="clip of clips">
    <video ref="clips" playsinline autoplay="true" :key="clip.index" muted loop>
      <source :src="clip.mp4" type="video/mp4">
    </video>
  </template>
</div>
</template>

<script>
import { TweenMax } from 'gsap/TweenMax'

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
      socket: io('/overlays/clipscarousel', {
        query: "token=" + token
      }),
      isPlaying: false,
      clips: [],
      currentClip: 0
    }
  },
  created: function () {
    this.socket.emit('clips', (err, data) => {
      for (let i = 0, len = data.clips.length; i < len; i++) {
        data.clips[i].index = Math.random()
        this.clips.push(data.clips[i])
      }
      this.$nextTick(() => {
        // center to first clip
        this.moveToNextClip()
      })
      this.volume = data.settings.volume
    })

    setInterval(() => {
      this.moveToNextClip()
    }, 45 * 1000)
  },
  methods: {
    moveToNextClip: function () {
      let clip = this.$refs.clips[++this.currentClip]
      if (typeof clip === 'undefined') {
        clip = this.$refs.clips[0]
        this.currentClip = 0
      }
      const offset = clip.offsetLeft - (window.innerWidth / 4)
      TweenMax.to(this.$refs.carousel, 1, { left: -offset + 'px',  })
      for (let i = 0, length = this.$refs.clips.length; i < length; i++) {
        if (i === this.currentClip) TweenMax.to(this.$refs.clips[i], 1, { filter: 'grayscale(0)', opacity: 1 })
        else TweenMax.to(this.$refs.clips[i], 1, { filter: 'grayscale(1)', opacity: 0.5 })
      }
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
  video { width: 40vw; padding: 5vw; display: inline-block }

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
