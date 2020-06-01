<template>
  <div id="emotes">
    <transition
      v-for="e of emotes"
      :key="e.id"
      :name="e.animation.type"
      :duration="e.animation.time"
      @leave="doAnimation"
      :css="false"
      v-on:before-leave="setTransition"
      >
      <img
        v-if="!e.animation.finished"
        v-show="e.show && !e.animation.running"
        :id="e.id"
        :src="e.url"
        style="position: absolute"
        :style="{ 'left': e.position.left + 'px', 'top': e.position.top + 'px' }"
      >
    </transition>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { gsap } from 'gsap'
import { getSocket } from 'src/panel/helpers/socket';
import { every, random, sample } from 'lodash-es';

@Component({})
export default class EmotesOverlay extends Vue {
  show = true;
  socket = getSocket('/overlays/emotes', true);
  emotes: any[] = [];
  interval: any[] = [];

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  created () {
    this.socket.on('emote.explode', (opts: any) => this.explode(opts))
    this.socket.on('emote.firework', (opts: any) => this.firework(opts))
    this.socket.on('emote', (opts: any) => this.addEmote(opts))

    this.interval.push(setInterval(() => {
      this.triggerAnimation()
      this.cleanEmotes()
    }, 100));
  }

  cleanEmotes () {
    if (every(this.emotes, o => o.animation.finished)) this.emotes = []
  }
  doAnimation (el: HTMLElement, done: () => void) {
    const id = el.id
    const emote = this.emotes.find(o => o.id === id)

    let animation: any = {
      opacity: 0
    }

    if (emote.animation.type === 'fadeup') {
      animation = {
        top: emote.position.top - 150,
        opacity: 0
      }
    } else if (emote.animation.type === 'facebook') {
      animation = {
        top: emote.position.top - random(window.innerHeight / 4, window.innerHeight / 1.2),
        left: random(emote.position.left - 60, emote.position.left + 60),
        opacity: 0
      }
    } else if (emote.animation.type === 'fadezoom') {
      animation = {
        scale: 2,
        opacity: 0
      }
    } else if (emote.animation.type === 'explosion') {
      animation = {
        top: random(0, window.innerHeight - 100),
        left: random(0, window.innerWidth - 100),
        opacity: 0
      }
    } else if (emote.animation.type === 'firework') {
      animation = {
        top: random(emote.position.top - 100, emote.position.top + 100),
        left: random(emote.position.left - 100, emote.position.left + 100),
        opacity: 0
      }
    }

    gsap.to(el, {
      duration: this.emotes.find(o => o.id === id).animation.time / 1000,
      ...animation,
      onComplete: () => {
        this.emotes.find(o => o.id === id).animation.finished = true
        done()
      }
    })
  }

  triggerAnimation () {
    for (let i = 0, length = this.emotes.length; i < length; i++) {
      if (!this.emotes[i].animation.running && Date.now() - this.emotes[i].trigger > 0) {
        // show and after next tick hide -> trigger animation
        this.emotes[i].show = true
        this.$nextTick(function () { this.emotes[i].animation.running = true })
      }
    }
  }

  setLeft (type: string) {
    if (type === 'fadeup' || type === 'fadezoom') return random(window.innerWidth - 200) + 100
    else if (type === 'facebook') return random(200) + window.innerWidth - 250
    else return window.innerWidth / 2
  }

  setTop (type: string) {
    if (type === 'fadeup' || type === 'fadezoom') return random(window.innerHeight - 200) + 100
    else if (type === 'facebook') return window.innerHeight - 20
    else return window.innerHeight / 2
  }

  addEmote (opts: any) {
    this.emotes.push({
      id: Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9),
      trigger: Date.now() + random(500),
      show: false,
      animation: {
        type: opts.settings.emotes.animation,
        time: opts.settings.emotes.animationTime,
        running: false,
        finished: false
      },
      position: {
        left: this.setLeft(opts.settings.emotes.animation),
        top: this.setTop(opts.settings.emotes.animation)
      },
      url: opts.url
    })
  }

  explode (opts: any) {
    for (var i = 0; i < opts.settings.explosion.numOfEmotes; i++) {
      this.emotes.push({
        id: Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9),
        trigger: Date.now() + random(3000),
        show: false,
        animation: {
          type: 'explosion',
          time: opts.settings.emotes.animationTime,
          running: false,
          finished: false
        },
        position: {
          left: random(-300, 300) + window.innerWidth / 2,
          top: random(-300, 300) + window.innerHeight / 2
        },
        url: sample(opts.emotes)
      })
    }
  }

  firework (opts: any) {
    for (let i = 0; i < opts.settings.fireworks.numOfExplosions; i++) {
      const commonTop = random(200, window.innerHeight - 200)
      const commonLeft = random(200, window.innerWidth - 200)
      const commonTrigger = Date.now() + random(3000)
      const commonUrl = sample(opts.emotes)

      for (let j = 0; j < opts.settings.fireworks.numOfEmotesPerExplosion; j++) {
        this.emotes.push({
          id: Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9),
          trigger: commonTrigger,
          show: false,
          animation: {
            type: 'firework',
            time: opts.settings.emotes.animationTime,
            running: false,
            finished: false
          },
          position: {
            left: commonLeft,
            top: commonTop
          },
          url: commonUrl
        })
      }
    }
  }
}
</script>