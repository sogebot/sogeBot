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

<script>
import { TweenLite } from 'gsap/TweenMax'
import _ from 'lodash'
import io from 'socket.io-client';

export default {
  props: ['token'],
  data: function () {
    return {
      show: true,
      socket: io('/overlays/emotes', {
        query: "token=" + token
      }),
      emotes: []
    }
  },
  created: function () {
    this.socket.on('emote.explode', (opts) => this.explode(opts))
    this.socket.on('emote.firework', (opts) => this.firework(opts))
    this.socket.on('emote', (opts) => this.addEmote(opts))

    setInterval(() => {
      this.triggerAnimation()
      this.cleanEmotes()
    }, 100)
  },
  methods: {
    cleanEmotes: function () {
      if (_.every(this.emotes, o => o.animation.finished)) this.emotes = []
    },
    doAnimation: function (el, done) {
      const id = el.id
      const emote = this.emotes.find(o => o.id === id)

      let animation = {
        opacity: 0
      }

      if (emote.animation.type === 'fadeup') {
        animation = {
          top: emote.position.top - 150,
          opacity: 0
        }
      } else if (emote.animation.type === 'facebook') {
        animation = {
          top: emote.position.top - _.random(window.innerHeight / 4, window.innerHeight / 1.2),
          left: _.random(emote.position.left - 60, emote.position.left + 60),
          opacity: 0
        }
      } else if (emote.animation.type === 'fadezoom') {
        animation = {
          scale: 2,
          opacity: 0
        }
      } else if (emote.animation.type === 'explosion') {
        animation = {
          top: _.random(0, window.innerHeight - 100),
          left: _.random(0, window.innerWidth - 100),
          opacity: 0
        }
      } else if (emote.animation.type === 'firework') {
        animation = {
          top: _.random(emote.position.top - 100, emote.position.top + 100),
          left: _.random(emote.position.left - 100, emote.position.left + 100),
          opacity: 0
        }
      }

      TweenLite.to(el, this.emotes.find(o => o.id === id).animation.time / 1000, {
        ...animation,
        onComplete: () => {
          this.emotes.find(o => o.id === id).animation.finished = true
          done()
        }
      })
    },
    triggerAnimation: function () {
      for (let i = 0, length = this.emotes.length; i < length; i++) {
        if (!this.emotes[i].animation.running && Date.now() - this.emotes[i].trigger > 0) {
          // show and after next tick hide -> trigger animation
          this.emotes[i].show = true
          this.$nextTick(function () { this.emotes[i].animation.running = true })
        }
      }
    },
    setLeft: function (type) {
      if (type === 'fadeup' || type === 'fadezoom') return _.random(window.innerWidth - 200) + 100
      else if (type === 'facebook') return _.random(200) + window.innerWidth - 250
      else return window.innerWidth / 2
    },
    setTop: function (type) {
      if (type === 'fadeup' || type === 'fadezoom') return _.random(window.innerHeight - 200) + 100
      else if (type === 'facebook') return window.innerHeight - 20
      else return window.innerHeight / 2
    },
    addEmote: function (opts) {
      this.emotes.push({
        id: Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9),
        trigger: Date.now() + _.random(500),
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
    },
    explode: function (opts) {
      for (var i = 0; i < opts.settings.explosion.numOfEmotes; i++) {
        this.emotes.push({
          id: Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9),
          trigger: Date.now() + _.random(3000),
          show: false,
          animation: {
            type: 'explosion',
            time: opts.settings.emotes.animationTime,
            running: false,
            finished: false
          },
          position: {
            left: _.random(-300, 300) + window.innerWidth / 2,
            top: _.random(-300, 300) + window.innerHeight / 2
          },
          url: _.sample(opts.emotes)
        })
      }
    },
    firework: function (opts) {
      for (let i = 0; i < opts.settings.fireworks.numOfExplosions; i++) {
        const commonTop = _.random(200, window.innerHeight - 200)
        const commonLeft = _.random(200, window.innerWidth - 200)
        const commonTrigger = Date.now() + _.random(3000)
        const commonUrl = _.sample(opts.emotes)

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
}
</script>