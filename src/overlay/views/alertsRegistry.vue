<template>
  <div>
    <template v-if="state.loaded === $state.success">
      <div v-if="urlParam('debug')" class="debug">
        <json-viewer :value="{data}" v-if="data" boxed copyable :expand-depth="2"></json-viewer>
        <json-viewer :value="{runningAlert}" v-if="runningAlert" boxed copyable :expand-depth="2"></json-viewer>
        <json-viewer :value="{alerts}" v-if="alerts" boxed copyable :expand-depth="2"></json-viewer>
      </div>
      <div v-if="runningAlert">
        <audio style="visibility: hidden; position: absolute" ref="audio">
          <source :src="runningAlert.alert.sound">
        </audio>
        <div v-show="runningAlert.isShowing" style="display: flex;" class="center" :class="['layout-' + runningAlert.alert.layout]">
          <img :src="runningAlert.alert.image" :class="{ center: runningAlert.alert.layout === '3' }" />
          <div
            v-if="runningAlert.isShowingText"
            :class="{
              center: runningAlert.alert.layout === '3'
            }"
            :style="{
              'font-family': runningAlert.alert.font.family,
              'font-size': runningAlert.alert.font.size + 'px',
              'font-weight': runningAlert.alert.font.weight,
              'color': runningAlert.alert.font.color,
              'text-shadow': textStrokeGenerator(runningAlert.alert.font.borderPx, runningAlert.alert.font.borderColor)
            }">
              <v-runtime-template :template="prepareMessageTemplate(runningAlert.alert.messageTemplate)"></v-runtime-template>
          </div>
          <div v-else
            :style="{
              'visibility': 'hidden',
              'font-family': runningAlert.alert.font.family,
              'font-size': runningAlert.alert.font.size + 'px',
              'font-weight': runningAlert.alert.font.weight,
              'color': runningAlert.alert.font.color,
              'text-shadow': textStrokeGenerator(runningAlert.alert.font.borderPx, runningAlert.alert.font.borderColor)
            }">{{runningAlert.alert.messageTemplate}}</div> <!-- empty div to mitigate text area -->
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import JsonViewer from 'vue-json-viewer'
import io from 'socket.io-client';
import VRuntimeTemplate from "v-runtime-template";

require('../../../scss/letter-animations.css');
require('animate.css');

@Component({
  components: {
    JsonViewer,
    VRuntimeTemplate,
    'baffle': () => import('../../panel/components/baffle'),
  }
})
export default class AlertsRegistryOverlays extends Vue {
  socket = io('/registries/alerts', {query: "token="+this.token});
  interval = 0;
  loadedFonts: string[] = [];

  state: {
    loaded: number,
  } = {
    loaded: this.$state.progress,
  }

  id: null | string = null;
  data: null | Registry.Alerts.Alert = null;
  defaultProfanityList: string[] = [];

  alerts: Registry.Alerts.EmitData[] = [];
  runningAlert: Registry.Alerts.EmitData & { isShowingText: boolean; isShowing: boolean; soundPlayed: boolean; hideAt: number; showTextAt: number; showAt: number; alert: Registry.Alerts.Follow | Registry.Alerts.Host | Registry.Alerts.Cheer | Registry.Alerts.Sub } | null = null;

  beforeDestroyed() {
    clearInterval(this.interval);
  }

  mounted() {
    this.interval = window.setInterval(() => {
      if (this.runningAlert) {
        // cleanup
        if (this.runningAlert.hideAt <= Date.now() + 2000) {
          this.runningAlert = null;
          return;
        }

        if (this.runningAlert.showAt <= Date.now() && !this.runningAlert.isShowing) {
          this.runningAlert.isShowing = true;
        }

        if (this.runningAlert.showTextAt <= Date.now() && !this.runningAlert.isShowingText) {
          this.runningAlert.isShowingText = true;
        }

        if (this.runningAlert.showAt >= Date.now() && !this.runningAlert.soundPlayed) {
          (this.$refs.audio as HTMLMediaElement).volume = this.runningAlert.alert.soundVolume / 100;
          (this.$refs.audio as HTMLMediaElement).play();
          this.runningAlert.soundPlayed = true;
        }
      }

      if (this.runningAlert === null && this.alerts.length > 0) {
        const emitData = this.alerts.shift()
        if (emitData && this.data) {
          const possibleAlerts = this.data.alerts[emitData.event];
          if (possibleAlerts.length > 0) {
            const alert = possibleAlerts[Math.floor(Math.random() * possibleAlerts.length)];
            this.runningAlert = {
              ...emitData,
              soundPlayed: false,
              isShowing: false,
              isShowingText: false,
              showAt: this.data.alertDelayInMs + Date.now(),
              hideAt: this.data.alertDelayInMs + Date.now() + alert.alertDurationInMs,
              showTextAt: this.data.alertDelayInMs + Date.now() + alert.alertTextDelayInMs,
              alert,
            };
          } else {
            this.runningAlert = null;
          }
        } else {
          this.runningAlert = null;
        }
      }
    }, 100);

    this.id = this.$route.params.id
    this.socket.emit('findOne', { where: { id: this.id }}, (err, data: Registry.Alerts.Alert) => {
      this.data = data;

      for (const [lang, isEnabled] of Object.entries(this.data.loadStandardProfanityList)) {
        if (isEnabled) {
          let list = require('../../bot/data/vulgarities/' + lang + '.txt');
          this.defaultProfanityList = [...this.defaultProfanityList, ...list.default.split(/\r?\n/)]
        }
      }

      this.defaultProfanityList = [
        ...this.defaultProfanityList,
        ...data.customProfanityList.split(',').map(o => o.trim()),
      ]

      console.debug('Profanity list', this.defaultProfanityList);
      this.state.loaded = this.$state.success;


      const head = document.getElementsByTagName('head')[0]
      const style = document.createElement('style')
      style.type = 'text/css';
      for (const lists of Object.values(data.alerts)) {
        for (const event of lists) {
          if (!this.loadedFonts.includes(event.font.family)) {
            console.debug('Loading font', event.font.family)
            this.loadedFonts.push(event.font.family)
            const font = event.font.family.replace(/ /g, '+')
            const css = "@import url('https://fonts.googleapis.com/css?family=" + font + "');"
            style.appendChild(document.createTextNode(css));
          }
        }
      }
      head.appendChild(style);

      console.debug('== alerts ready ==')
    })

    this.socket.on('alert', (data: Registry.Alerts.EmitData) => {
      console.debug('Incoming alert', data);
      this.alerts.push(data)
    })
  }

  prepareMessageTemplate(msg) {
    if (this.runningAlert !== null) {
      let name: string | string[] = this.runningAlert.name.split('').map((char, index) => {
        if (this.runningAlert !== null) {
          return `<div class="animated infinite ${this.runningAlert.alert.animationText} ${this.runningAlert.alert.animationTextOptions.speed}" style="animation-delay: ${index * 50}ms; color: ${this.runningAlert.alert.font.highlightcolor}; display: inline-block;">${char}</div>`;
        } else {
          return char;
        }
      })

      if (this.runningAlert.alert.animationText === 'baffle') {
        name = `<baffle :text="runningAlert.name" :options="runningAlert.alert.animationTextOptions" style="color: ${this.runningAlert.alert.font.highlightcolor}"/>`
      } else {
        name = name.join('');
      }
      msg = msg.replace(/\{name\}/g, name);
    }
    return `<span>${msg}</span>`;
  }

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
  }
}
</script>

<style scoped>
  .debug {
    z-index: 9999;
    background-color: rgba(255, 255, 255, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }

  .center {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: max-content;
  }

  .layout-1 {
    flex-direction: column;
  }
  .layout-2 {
    flex-direction: column-reverse;
  }
  .layout-4 {
    align-items: center;
    flex-direction: row-reverse;
  }
  .layout-5 {
    align-items: center;
    flex-direction: row;
  }

  img {
    max-width: max-content;
    margin-left: auto;
    margin-right: auto;
  }
</style>