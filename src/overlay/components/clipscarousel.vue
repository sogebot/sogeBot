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

export default {
  props: ['token'],
  data: function () {
    return {
      socket: io('/overlays/clipscarousel', {
        query: "token=" + token
      }),
      isPlaying: false,
      clips: [],
      currentClip: 0,
      timeToNextClip: 45,
    }
  },
  created: function () {
    this.socket.emit('clips', (err, data) => {
      this.timeToNextClip = data.settings.timeToNextClip
      data.clips = data.clips
        .map((a) => ({sort: Math.random(), value: a}))
        .sort((a, b) => a.sort - b.sort)
        .map((a) => a.value)
      for (let i = 0, len = data.clips.length; i < len; i++) {
        data.clips[i].index = Math.random()
        this.clips.push(data.clips[i])
      }
      this.$nextTick(() => {
        // center to first clip
        this.moveToNextClip()

        setInterval(() => {
          this.moveToNextClip()
        }, this.timeToNextClip * 1000)
      })
    })
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
  video { width: 40vw; padding: 5vw; display: inline-block }
</style>
