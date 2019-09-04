<template>
<div>
  <pre class="debug" v-if="urlParam('debug')">
<button @click="stopAnimation = !stopAnimation">Toggle Animation</button>

stopAnimation: {{ stopAnimation }}
clipsSet: {{ clipsSet.map(o => o.id) }},
isPlaying: {{ isPlaying }},
clips: {{ clips.map(o => o.id) }},
currentClip: {{ currentClip }},
nextClip: {{ nextClip }},
timeToNextClip: {{ timeToNextClip }},
offset: {{ offset }},
nextOffset: {{ nextOffset }}
  </pre>
  <div ref="carousel" style="width: 99999999999%; position: absolute;">
    <template v-for="(clip, index) of clipsSet">
      <video ref="clips" playsinline autoplay="true" :key="clip.index" :id="clip.index" muted loop :style="{ opacity: index === 1 ? '1' : '0.5', filter: 'grayscale(' + (index === 1 ? '0' : '1') + ')'}">
        <source :src="clip.mp4" type="video/mp4">
      </video>
    </template>
  </div>
</div>
</template>

<script lang="ts">

import { Vue, Component, Watch } from 'vue-property-decorator';
import { TweenMax } from 'gsap/TweenMax'
import io from 'socket.io-client';
import { chunk, cloneDeep } from 'lodash';

@Component({})
export default class ClipsCarouselOverlay extends Vue {
  socket = io('/overlays/clipscarousel', { query: "token=" + this.token });
  isPlaying = false;
  clips: any[] = [];
  clipsSet: any[] = [];
  currentClip = 0;
  nextClip: any = {};
  timeToNextClip = 45;
  offset = 0;
  nextOffset = 0;
  stopAnimation = false;


  get dNumOfClips() {
    return Number(this.urlParam('clips'))
  }
  get debug() {
    return Boolean(this.urlParam('debug'))
  }

  created() {
    this.socket.emit('clips', (err, data) => {
      this.timeToNextClip = data.settings.timeToNextClip
      data.clips = data.clips
        .map((a) => ({sort: Math.random(), value: a}))
        .sort((a, b) => a.sort - b.sort)
        .map((a) => a.value)

      if (this.debug && this.dNumOfClips) {
        data.clips = chunk(data.clips, this.dNumOfClips)[0]
      }

      if (data.clips.length < 2) return console.error('At least 2 clips are needed')


      data.clips = this.fillToFourClips(data.clips)
      for (let clip of data.clips) {
        clip.index = Math.random()
      }
      this.clips = data.clips
      this.getClipsSet()
      this.$nextTick(() => {
        // center to second clip
        this.moveToNextClip(true)

        setInterval(() => {
          this.moveToNextClip()
        }, this.timeToNextClip * 1000)

        setInterval(() => {
          this.getClipsSet()
        }, 100)
      })
    })
  }

  @Watch('currentClip')
  currentClipWatcher() {
    this.getClipsSet()
  }

  getClipsSet() {
    if (this.clips.length === 0 ) return this.clipsSet

    let clipsSet: any[] = []
    for (let i = this.currentClip, j = 0; j < 4; i++, j++) {
      if (typeof this.clips[i] === 'undefined') i = i % this.clips.length
      clipsSet.push(cloneDeep(this.clips[i]))
    }

    this.$nextTick(() => {
      // on next tick we need to set proper opacities to 0.5
      (this.$refs.carousel as HTMLElement).style.left = -this.offset + 'px'

      const currentClip: any = clipsSet[1]
      this.nextClip = clipsSet[2]

      if (this.$refs.clips) {
        for (let j = 0; j < 4; j++) {
          this.$refs.clips[j].style.opacity = this.$refs.clips[j].getAttribute("id") === String(currentClip.index) ? '1' : '0.5'
          this.$refs.clips[j].style.filter = this.$refs.clips[j].getAttribute("id") === String(currentClip.index) ? 'grayscale(0)' : 'grayscale(1)'
        }

        for (let i = 0, length = (this.$refs.clips as HTMLElement[]).length; i < length; i++) {
          this.$refs.clips[i].play()
        }
      }
    })
    this.clipsSet = clipsSet
  }

  fillToFourClips(clips) {
    if (clips.length >= 4 || clips.length === 0) return clips
    else {
      let filledClips = Object(clips)
      for (let i = 0, length = clips.length, idx = 0; i < 4 - length % 4; i++) {
        if (clips[idx]) {
          filledClips.push(cloneDeep(clips[idx]))
          idx++
        } else {
          filledClips.push(cloneDeep(clips[0]))
          idx = 1
        }
      }
      return filledClips
    }
  }

  moveToNextClip(withoutChange = false) {
    if (this.stopAnimation) return

    if (this.clips.length === 0 || (this.$refs.clips as HTMLElement[]).length < 4) return console.error('No clips were found')

    if (this.nextOffset === 0 ) this.nextOffset = this.$refs.clips[2].offsetLeft - (window.innerWidth / 4)
    if (this.offset === 0) this.offset = this.$refs.clips[1].offsetLeft - (window.innerWidth / 4)

    const clips = [...(this.$refs.clips as HTMLElement[])]
    TweenMax.to(this.$refs.carousel, 1, { left: -this.nextOffset + 'px' })

    for (let i = 0; i < 4; i++) {
      if (this.$refs.clips[i].getAttribute("id") === String(this.nextClip.index)) {
        TweenMax.to(clips[i], 1, { opacity: 1, filter: 'grayscale(0)' })
      } else {
        TweenMax.to(clips[i], 1, { opacity: 0.5, filter: 'grayscale(1)' })
      }
    }
    setTimeout(() => {
      if (!withoutChange) this.currentClip++
      this.$nextTick(() => {
        // on next tick we need to set proper opacities to 0.5
        TweenMax.killAll() // we need to kill tweens as it skip to incorrect videos
      })
    }, 1000)
  }
}
</script>

<style scoped>
  video { width: 40vw; padding: 5vw; display: inline-block }

  .debug {
    z-index: 9999;
    background-color: rgba(0, 0, 0, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }
</style>
