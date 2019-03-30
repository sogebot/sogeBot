<template>
<div class="w-100 h-100" v-if="group">
  <template v-for="(goal, index) of goals">
    <transition
      @before-enter="beforeEnter"
      @enter="doEnterAnimation"
      @leave="doLeaveAnimation"
      :css="false"
      :key="index">
      <b-progress
        v-if="goal.display === 'simple' && (goals.length === 1 || show === index || group.display.type === 'multi')"
        :height="goal.customization.bar.height + 'px'"
        :max="goal.goalAmount"
        style="border-radius: 0;"
        class="w-100"
        :class="{ disabled: isDisabled(index), 'position-absolute': group.display.type !== 'multi' }"
        :style="{
          border: goal.customization.bar.borderPx + 'px solid ' + goal.customization.bar.borderColor,
          'background-color': goal.customization.bar.backgroundColor ,
          'font-family': getFontFamilyCSS(goal.customization.font.family),
          'margin-top': index !== 0 && goals.length > 0 && group.display.type === 'multi' ? group.display.spaceBetweenGoalsInPx + 'px' : '0px',
        }">
        <b-progress-bar
          :value="Number(goal.currentAmount)"
          :style="{
            'background-color': goal.customization.bar.color
          }"></b-progress-bar>
        <div class="row no-gutters"
          :style="{
            'position': 'absolute',
            'height': (goal.customization.bar.height - (goal.customization.bar.borderPx * 2)) + 'px',
            'line-height': (goal.customization.bar.height - (goal.customization.bar.borderPx * 2)) + 'px',
            'width': '100%',
            'color': goal.customization.font.color,
            'font-size': goal.customization.font.size + 'px',
            'text-shadow': textStrokeGenerator(goal.customization.font.borderPx, goal.customization.font.borderColor)
          }">
          <div class="col-4 text-left text-nowrap pl-2 pr-2">{{ goal.name }}</div>
          <div class="col-4 text-nowrap text-center">
            <template v-if="goal.type === 'tips'">
              {{ Number(goal.currentAmount).toFixed(2) }}{{ configuration.currencySymbol }}
            </template>
            <template v-else>{{ goal.currentAmount }}</template>
          </div>
          <div class="col-4 text-nowrap text-right pr-2">
            <template v-if="goal.type === 'tips'">
              {{ Number(goal.goalAmount).toFixed(2) }}{{ configuration.currencySymbol }}
            </template>
            <template v-else>{{ goal.goalAmount }}</template></div>
        </div>
      </b-progress>
      <div
        :class="{ disabled: isDisabled(index), 'position-absolute': group.display.type !== 'multi' }"
        style="width: 100%"
        :style="{
          'padding-top': index !== 0 && goals.length > 0 && group.display.type === 'multi' ? group.display.spaceBetweenGoalsInPx + 'px' : '0px',
        }"
        v-else-if="goal.display === 'full' && (goals.length === 1 || group.display.type === 'multi' || show === index)">
        <div class="row no-gutters"
          :style="{
            'color': goal.customization.font.color,
            'font-size': goal.customization.font.size + 'px',
            'text-shadow': textStrokeGenerator(goal.customization.font.borderPx, goal.customization.font.borderColor)
          }">
          <div class="col text-center text-truncate pl-2 pr-2">{{ goal.name }}</div>
        </div>
        <b-progress
          :height="goal.customization.bar.height + 'px'"
          :max="goal.goalAmount"
          style="border-radius: 0;"
          class="w-100"
          :class="{ disabled: isDisabled(index) }"
          :style="{
            border: goal.customization.bar.borderPx + 'px solid ' + goal.customization.bar.borderColor,
            'background-color': goal.customization.bar.backgroundColor,
            'font-family': getFontFamilyCSS(goal.customization.font.family)
          }">
          <b-progress-bar
            :value="Number(goal.currentAmount)"
            :style="{
              'background-color': goal.customization.bar.color
            }"></b-progress-bar>
          <div class="row no-gutters"
            :style="{
              'position': 'absolute',
              'height': (goal.customization.bar.height - (goal.customization.bar.borderPx * 2)) + 'px',
              'line-height': (goal.customization.bar.height - (goal.customization.bar.borderPx * 2)) + 'px',
              'width': '100%',
              'color': goal.customization.font.color,
              'font-size': goal.customization.font.size + 'px',
              'text-shadow': textStrokeGenerator(goal.customization.font.borderPx, goal.customization.font.borderColor)
            }">
            <div class="col text-center">
              <template v-if="goal.type === 'tips'">
                {{ Number(goal.currentAmount).toFixed(2) }}{{ configuration.currencySymbol }} ({{ Number((100 / goal.goalAmount) * goal.currentAmount).toFixed() }}%)
              </template>
              <template v-else>{{ goal.currentAmount }} ({{ Number((100 / goal.goalAmount) * goal.currentAmount).toFixed() }}%)</template>
            </div>
          </div>
        </b-progress>
        <div class="row no-gutters"
          :style="{
            'width': '100%',
            'color': goal.customization.font.color,
            'font-size': goal.customization.font.size + 'px',
            'text-shadow': textStrokeGenerator(goal.customization.font.borderPx, goal.customization.font.borderColor)
          }">
          <div class="col text-left pl-2">
            <template v-if="goal.type === 'tips'">
              0.00{{ configuration.currencySymbol }}
            </template>
            <template v-else>0</template>
          </div>
          <div class="col-auto text-truncate text-center text-uppercase pl-2 pr-2" v-if="!goal.endAfterIgnore">
            {{ $moment().to(goal.endAfter) }}
          </div>
          <div class="col text-right pr-2">
            <template v-if="goal.type === 'tips'">
              {{ Number(goal.goalAmount).toFixed(2) }}{{ configuration.currencySymbol }}
            </template>
            <template v-else>{{ goal.goalAmount }}</template>
          </div>
        </div>
      </div>
      <div
        v-else-if="goal.display === 'custom' && (goals.length === 1 || group.display.type === 'multi' || show === index)"
        class="wrap"
        :id="'wrap-' + goal.uid"
        v-html="goal.customization.html"></div>
    </transition>
  </template>
</div>
</template>

<script lang="ts">
import io from 'socket.io-client';
import safeEval from 'safe-eval'

import Vue from 'vue';

import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
Vue.use(BootstrapVue);

import moment from 'moment'
import VueMoment from 'vue-moment'
import momentTimezone from 'moment-timezone'
require('moment/locale/cs')
require('moment/locale/ru')
Vue.use(VueMoment, {
    moment, momentTimezone
})

import { TweenLite } from 'gsap/TweenMax'

export default Vue.extend({
  props: ['token'],
  data: function () {
    const object: {
      show: number,
      group: Goals.Group | null,
      goals: Goals.Goal[],
      loadedFonts: string[]
      socket: any,
      lastSwapTime: number,
      triggerUpdate: string[],
      cssLoaded: string[],
      current: { subscribers: number, followers: number }
    } = {
      show: -1,
      group: null,
      goals: [],
      socket: io('/overlays/goals', {query: "token=" + this.token}),
      lastSwapTime: Date.now(),
      loadedFonts: [],
      triggerUpdate: [],
      cssLoaded: [],
      current: { subscribers: 0, followers: 0 }
    };
    return object
  },
  mounted: function () {
    this.$moment.locale(this.configuration.lang)
    this.refresh()
    setInterval(() => this.refresh(), 5000)
    setInterval(() => {
      if (this.group === null) return

      if (this.show === -1) return (this.lastSwapTime = Date.now())

      if (this.group.display.type === 'fade') {
        if (this.lastSwapTime + Number(this.group.display.durationMs) < Date.now()) {
          this.lastSwapTime = Date.now() + Number(this.group.display.animationInMs) + Number(this.group.display.animationOutMs)
          if (typeof this.goals[this.show + 1] === 'undefined') this.show = 0
          else this.show = this.show + 1
        }
      }
    }, 100)
  },
  methods: {
    beforeEnter: function (el) {
      el.style.opacity = 0
    },
    doEnterAnimation: function (el, done) {
      if (this.group === null) return
      if (this.group.display.type === 'fade') {
        TweenLite.to(el, (this.group.display.animationInMs || 1000) / 1000, {
          opacity: 1,
          onComplete: () => {
            done()
          }
        })
      }
    },
    doLeaveAnimation: function (el, done) {
      if (this.group === null) return
      if (this.group.display.type === 'fade') {
        TweenLite.to(el, (this.group.display.animationOutMs || 1000) / 1000, {
          opacity: 0,
          onComplete: () => {
            done()
          }
        })
      }
    },
    isDisabled(idx) {
      if (this.group === null) return false;

      const goal = this.goals[idx]
      return new Date(goal.endAfter).getTime() <= new Date().getTime() && !goal.endAfterIgnore
    },
    textStrokeGenerator(radius, color) {
      if (radius === 0) return ''

      // config
      const steps = 30;
      const blur = 2;
      // generate text shadows, spread evenly around a circle
      const radianStep = steps / (Math.PI * 2);
      let cssStr = '';
      for (let r=1; r <= radius; r++) {
        for(let i=0; i < steps; i++) {
          const curRads = radianStep * i;
          const xOffset = (r * Math.sin(curRads)).toFixed(1);
          const yOffset = (r * Math.cos(curRads)).toFixed(1);
          if(i > 0 || r > 1) cssStr += ", ";
          cssStr += xOffset + "px " + yOffset + "px " + blur + "px " + color;
        }
      }
      return cssStr
    },
    getFontFamilyCSS (family) {
      return `"${family}" !important`;
    },
    refresh: function () {
      const uid = window.location.href.split('/')[window.location.href.split('/').length - 1]
      if (uid) {
        this.socket.emit('current', (err, current: { subscribers: number, followers: number }) => {
          if (err) return console.error(err)
          this.current = current
        })
        this.socket.emit('findOne', { collection: 'groups', where: { uid }}, (err, cb: Goals.Group | null) => {
          if (err) return console.error(err)
          this.group = cb
        })

        this.socket.emit('find', { collection: 'goals', where: { groupId: uid }}, (err, goals: Goals.Goal[]) => {
          if (err) return console.error(err)

        // run check first
        if (this.goals.length > 0) {
          for (const goal of this.goals) {
            let _goal = this._.find(this.goals, (o) => o.uid === goal.uid)
            if (typeof _goal !== 'undefined') {
              if (Number(_goal.currentAmount) !== Number(goal.currentAmount)) {
                console.debug(_goal.currentAmount + ' => ' + goal.currentAmount)
                this.triggerUpdate.push(goal.uid)
              }
            }
          }
        }

        this.goals = goals

        // update currentAmount for current types
        for (const goal of this.goals) {
          if (goal.type === 'currentFollowers') {
            if (goal.currentAmount !== this.current.followers) this.triggerUpdate.push(goal.uid)
            goal.currentAmount = this.current.followers
          }
          if (goal.type === 'currentSubscribers') {
            if (goal.currentAmount !== this.current.subscribers) this.triggerUpdate.push(goal.uid)
            goal.currentAmount = this.current.subscribers
          }
        }

        // add css import
        for (const goal of this.goals) {
          if (!this.cssLoaded.includes(goal.uid)) {
            this.cssLoaded.push(goal.uid);
            const head = document.getElementsByTagName('head')[0]
            const style = document.createElement('style')
            style.type = 'text/css';
            if (!this.loadedFonts.includes(goal.customization.css)) {
              this.loadedFonts.push(goal.customization.css)
              const css = goal.customization.css
                .replace(/\#wrap/g, '#wrap-' + goal.uid) // replace .wrap with only this goal wrap
              style.appendChild(document.createTextNode(css));
            }
            head.appendChild(style);
          }
        }

        // add fonts import
        const head = document.getElementsByTagName('head')[0]
        const style = document.createElement('style')
        style.type = 'text/css';

        for (const goal of this.goals) {
          if (!this.loadedFonts.includes(goal.customization.font.family)) {
            this.loadedFonts.push(goal.customization.font.family)
            const font = goal.customization.font.family.replace(/ /g, '+')
            const css = "@import url('https://fonts.googleapis.com/css?family=" + font + "');"
            style.appendChild(document.createTextNode(css));
          }
        }
        head.appendChild(style);

        // if custom html update all variables
        for (const goal of this.goals) {
          if (goal.display === 'custom') {
            goal.customization.html = goal.customization.html
              .replace(/\$name/g, goal.name)
              .replace(/\$type/g, goal.type)
              .replace(/\$goalAmount/g, String(goal.goalAmount))
              .replace(/\$currentAmount/g, String(goal.currentAmount))
              .replace(/\$percentageAmount/g, Number((100 / goal.goalAmount) * goal.currentAmount).toFixed())
              .replace(/\$endAfter/g, goal.endAfter)
          }

          // trigger onUpdate on nextTick
          this.$nextTick(() => {
            if (this.triggerUpdate.includes(goal.uid)) {
              const idx = this.triggerUpdate.indexOf(goal.uid);
              this.triggerUpdate.splice(idx, 1);

              console.debug('onUpdate : ' + goal.uid)
              let toEval = `(function evaluation () { ${goal.customization.js}; onChange(${goal.currentAmount}) })()`
              safeEval(toEval)
            }
          })
        }

          this.$nextTick(() => { if (this.show === -1) this.show = 0; })
        })
      } else {
        console.error('Missing id param in url')
      }
    }
  }
})
</script>

<style scoped>
.disabled {
  opacity: 0.5;
  filter: grayscale(0.7);
}
</style>
