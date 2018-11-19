<template>
<div ref="carousel" style="width: 99999999999%; position: absolute;">
  <template v-for="(clip, index) of getClipsSet()">
    <video ref="clips" playsinline autoplay="true" :key="clip.index" :id="clip.index" muted loop :style="{ opacity: index === 1 ? '1' : '0.5', filter: 'grayscale(' + (index === 1 ? '0' : '1') + ')'}">
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
      offset: 0,
      nextOffset: 0
    }
  },
  created: function () {
    this.socket.emit('clips', (err, data) => {
      this.timeToNextClip = data.settings.timeToNextClip
      data.clips = data.clips
        .map((a) => ({sort: Math.random(), value: a}))
        .sort((a, b) => a.sort - b.sort)
        .map((a) => a.value)

      data.clips = this.fillToFourClips(data.clips)
      for (let clip of data.clips) {
        clip.index = Math.random()
      }
      this.clips = data.clips
      this.$nextTick(() => {
        // center to second clip
        this.moveToNextClip()

        setInterval(() => {
          this.moveToNextClip()
        }, this.timeToNextClip * 1000)
      })
    })
  },
  methods: {
    getClipsSet: function () {
      if (this.clips.length === 0) return []

      let clipsSet = []
      for (let i = this.currentClip, j = 0; j < 4; i++, j++) {
        if (typeof this.clips[i] === 'undefined') i = 0
        clipsSet.push(this.clips[i])
      }
      this.$nextTick(() => {
        for (let i = 0, length = this.$refs.clips.length; i < length; i++) {
          this.$refs.clips[i].play()
        }
      })
      return clipsSet
    },
    fillToFourClips: function (clips) {
      if (clips.length >= 4 || clips.length === 0) return clips
      else {
        let filledClips = Object(clips)
        for (let i = 0, length = clips.length, idx = 0; i < 4 - length % 4; i++) {
          if (clips[idx]) {
            filledClips.push(clips[idx])
            idx++
          } else {
            filledClips.push(clips[0])
            idx = 1
          }
        }
        return filledClips
      }
    },
    moveToNextClip: function () {
      if (this.clips.length === 0 || this.$refs.clips.length < 4) return console.error('No clips were found')

      if (this.nextOffset === 0 ) this.nextOffset = this.$refs.clips[2].offsetLeft - (window.innerWidth / 4)
      if (this.offset === 0) this.offset = this.$refs.clips[1].offsetLeft - (window.innerWidth / 4)

      const clips = [...this.$refs.clips]
      TweenMax.to(this.$refs.carousel, 1, { left: -this.nextOffset + 'px' })
      for (let i = 0; i < 4; i++) {
        if (i === 2) {
          TweenMax.to(clips[i], 1, { opacity: 1, filter: 'grayscale(0)' })
        } else {
          TweenMax.to(clips[i], 1, { opacity: 0.5, filter: 'grayscale(1)' })
        }
      }
      setTimeout(() => {
        this.currentClip++
        this.$nextTick(() => {
          // on next tick we need to set proper opacities to 0.5
          TweenMax.killAll() // we need to kill tweens as it skip to incorrect videos
          this.$refs.carousel.style.left = -this.offset + 'px'
          for (let j = 0; j < 4; j++) {
            this.$refs.clips[j].style.opacity = j === 1 ? '1' : '0.5'
            this.$refs.clips[j].style.filter = j === 1 ? 'grayscale(0)' : 'grayscale(1)'
          }
        })
      }, 1000)
    }
  }
}
</script>

<style scoped>
  video { width: 40vw; padding: 5vw; display: inline-block }
</style>
