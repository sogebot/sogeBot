<template>
  <div>
    <pre
      v-if="urlParam('debug')"
      class="debug"
      style="overflow: scroll; resize: both;"
    >
<button @click="stopAnimation = !stopAnimation">Toggle Animation</button>

stopAnimation: {{ stopAnimation }}
clipsSet: {{ clipsSet.map(o => o.id) }},
clips: {{ clips.map(o => o.id) }},
currentClip: {{ currentClip }},
offset: {{ offset }},
nextOffset: {{ nextOffset }}
moveToNextClipInProgress: {{ moveToNextClipInProgress }}
isReady: {{ isReady }}
  </pre>
    <div
      ref="carousel"
      :style="{
        width: '99999999999%',
        position: 'absolute',
        opacity: isReady ? '1' : '0',
        transition: 'opacity 1s'
      }"
    >
      <template v-for="(clip, index) of clipsSet">
        <video
          :id="clip.id"
          ref="clips"
          :key="clip.id"
          preload="auto"
          playsinline
          :style="{ opacity: index === 1 ? '1' : '0.5', filter: 'grayscale(' + (index === 1 ? '0' : '1') + ')'}"
        >
          <source
            :src="clip.mp4"
            type="video/mp4"
          >
        </video>
      </template>
    </div>
  </div>
</template>

<script lang="ts">

import { getSocket } from '@sogebot/ui-helpers/socket';
import gsap from 'gsap';
import { cloneDeep } from 'lodash-es';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';

@Component({})
export default class ClipsCarouselOverlay extends Vue {
  @Prop() readonly opts !: null | { volume: number };

  socket = getSocket('/overlays/clipscarousel', true);
  clips: any[] = [];
  clipsSet: any[] = [];
  currentClip = 14;
  offset = 0;
  nextOffset = 0;
  stopAnimation = false;
  isReady = false;
  moveToNextClipInProgress = false;

  get debug() {
    return Boolean(this.urlParam('debug'));
  }

  setOffset() {
    try {
      this.nextOffset = -((this.$refs.clips as HTMLElement[])[2].offsetLeft - (window.innerWidth / 4));
      this.offset = -((this.$refs.clips as HTMLElement[])[1].offsetLeft - (window.innerWidth / 4));
    } catch (e) {}
  }

  created() {
    this.socket.emit('clips', (err: string | null, data: { clips: any, settings: any }) => {
      data.clips = data.clips
        .map((a: any) => ({ sort: Math.random(), value: a }))
        .sort((a: any, b: any) => a.sort - b.sort)
        .map((a: any) => a.value);

      if (data.clips.length < 2) {
        return console.error('At least 2 clips are needed');
      }

      data.clips = this.fillToFourClips(data.clips);
      this.clips = data.clips;
      this.getClipsSet();
      this.$nextTick(() => {
        // center to second clip
        this.setOffset();
        this.moveToNextClip();

        setInterval(() => {
          if (this.moveToNextClipInProgress) {
            return;
          }

          this.getClipsSet();
          this.setOffset();

          if ((this.$refs.clips as HTMLVideoElement[])[1].ended) {
            this.moveToNextClip();
            // play idx 2 to have video started during animation
            (this.$refs.clips as HTMLVideoElement[])[2].play();
            // stop idx 1 to have video stopped during animation
            (this.$refs.clips as HTMLVideoElement[])[1].pause();
          } else {
            // check if video is done -> next clip
            if (!(this.$refs.clips as HTMLVideoElement[])[1].ended) {
              for (let i=0; i < 4; i++) {
                if (i===1) {
                  (this.$refs.clips as HTMLVideoElement[])[i].volume = (this.opts?.volume ?? 0) / 100;
                  (this.$refs.clips as HTMLVideoElement[])[i].play();
                } else {
                  (this.$refs.clips as HTMLVideoElement[])[i].volume = 0;
                  (this.$refs.clips as HTMLVideoElement[])[i].pause();
                }
              }
            }
          }
        }, 100);
      });
    });
  }

  @Watch('currentClip')
  currentClipWatcher() {
    this.getClipsSet();
  }

  getClipsSet() {
    if (this.clips.length === 0 ) {
      return this.clipsSet;
    }

    const clipsSet: any[] = [];
    for (let i = this.currentClip, j = 0; j < 4; i++, j++) {
      if (typeof this.clips[i] === 'undefined') {
        i = i % this.clips.length;
      }
      clipsSet.push(cloneDeep(this.clips[i]));
    }

    this.$nextTick(() => {
      // on next tick we need to set proper opacities to 0.5
      (this.$refs.carousel as HTMLElement).style.left = this.offset + 'px';
      if (this.$refs.clips) {
        for (let j = 0; j < 4; j++) {
          if (j === 1) {
            (this.$refs.clips as HTMLElement[])[j].style.opacity = '1';
            (this.$refs.clips as HTMLElement[])[j].style.filter = 'grayscale(0)';
          } else {
            (this.$refs.clips as HTMLElement[])[j].style.opacity = String(0.5);
            (this.$refs.clips as HTMLElement[])[j].style.filter = 'grayscale(1)';
          }
        }
      }
    });
    this.clipsSet = clipsSet;
  }

  fillToFourClips(clips: any) {
    if (clips.length >= 4 || clips.length === 0) {
      return clips;
    } else {
      const filledClips = [...clips];
      for (let i = 0, length = clips.length, idx = 0; i < 4 - length % 4; i++) {
        if (clips[idx]) {
          filledClips.push(cloneDeep(clips[idx]));
          idx++;
        } else {
          filledClips.push(cloneDeep(clips[0]));
          idx = 1;
        }
      }
      return filledClips;
    }
  }

  moveToNextClip() {
    if (this.offset > 0) {
      // we cannot have + offset, try again
      this.setOffset();
      this.moveToNextClipInProgress = true;
      //this.$nextTick(this.moveToNextClip);
      return;
    }
    if (this.stopAnimation) {
      return;
    }

    this.moveToNextClipInProgress = true;

    if (this.clips.length === 0 || (this.$refs.clips as HTMLElement[]).length < 4) {
      return console.error('No clips were found');
    }

    const clips = [...(this.$refs.clips as HTMLElement[])];
    gsap.to(this.$refs.carousel, { duration: 1, left: this.nextOffset + 'px' });

    for (let i = 0; i < 4; i++) {
      let opacity = 0.5;
      let filter = 'grayscale(1)';
      if (i === 2) {
        opacity = 1;
        filter = 'grayscale(0)';
      }
      gsap.to(clips[i], {
        duration:   1, opacity, filter, onComplete: () => {
          this.$nextTick(() => {
          // on next tick we need to set proper opacities to 0.5
            gsap.killTweensOf(clips[i]); // we need to kill tweens as it skip to incorrect videos
            this.$forceUpdate();
            setTimeout(() => {
              if (i === 3) {
                if (this.currentClip + 1 === this.clips.length) {
                  this.currentClip = 0; // go from beggining to not overcalculate
                } else {
                  this.currentClip++; // move to next on the end
                }
              }
              this.moveToNextClipInProgress = false;
              setTimeout(() => {
                this.isReady = true;
              }, 1000);
            }, 1000);

          });
        },
      });
    }
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
