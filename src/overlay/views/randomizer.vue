<template>
<div>
  <div v-if="urlParam('debug')" class="debug">
    <json-viewer :value="data || {}" boxed copyable :expand-depth="4"></json-viewer>
  </div>
  <div
    v-show="showSimpleBlink"
    v-if="data && data.type === 'simple'" :style="{
    color: generateItems(data.items)[showSimpleValueIndex].color,
    'font-size': data.customizationFont.size + 'px',
    'font-family': data.customizationFont.family,
    'text-align': 'center',
    'text-shadow': textStrokeGenerator(data.customizationFont.borderPx, data.customizationFont.borderColor)
    }">
    {{ generateItems(data.items)[showSimpleValueIndex].name }}
  </div>
  <div v-if="data && data.type === 'wheelOfFortune'">
    <canvas id='canvas' ref="canvas" width="1920" height="1080" style="width: 100%; height: 100%" data-responsiveMinWidth="180"
    data-responsiveScaleHeight="true"
    data-responsiveMargin="1">
      Canvas not supported, use another browser.
    </canvas>
    <div v-if="wheelWin" id="winbox" :style="{
      color: getContrastColor(wheelWin.fillStyle),
      'font-size': (data.customizationFont.size + 15)+ 'px',
      'font-family': data.customizationFont.family,
      'text-align': 'center',
      'background-color': wheelWin.fillStyle, // add alpha
      'text-shadow': textStrokeGenerator(data.customizationFont.borderPx, data.customizationFont.borderColor)
    }">{{wheelWin.text}}</div>
  </div>
</div>
</template>

<script lang="ts">
import type { RandomizerItemInterface, RandomizerInterface } from 'src/bot/database/entity/randomizer';

import { Vue, Component } from 'vue-property-decorator';
import { cloneDeep, isEqual } from 'lodash-es';

import { gsap } from 'gsap'
import Winwheel from 'winwheel'
import JsonViewer from 'vue-json-viewer'

import { getSocket } from 'src/panel/helpers/socket';
import { getContrastColor } from 'src/panel/helpers/color';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSortDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import * as defaultTick from 'src/panel/views/registries/randomizer/media/click_wheel.mp3';

library.add(faSortDown)

let theWheel: any = null;

declare global {
  interface Window {
    responsiveVoice: any;
  }
}

@Component({
  components: {
    JsonViewer,
    'font-awesome-icon': FontAwesomeIcon
  }
})
export default class RandomizerOverlay extends Vue {
  getContrastColor = getContrastColor;

  loadedFonts: string[] = [];

  socketRV = getSocket('/integrations/responsivevoice', true);
  responsiveAPIKey: string | null = null;

  socket = getSocket('/registries/randomizer', true);
  data: Required<RandomizerInterface> | null = null;

  showSimpleValueIndex = 0;
  showSimpleSpeed = 1; // lower = faster
  showSimpleBlink = true;
  showSimpleLoop = 0;

  theWheel: any = null;
  wheelWin: any = null;

  speak(text, voice, rate, pitch, volume) {
    window.responsiveVoice.speak(text, voice, { rate, pitch, volume });
  }

  initResponsiveVoice() {
    if (typeof window.responsiveVoice === 'undefined') {
      return setTimeout(() => this.initResponsiveVoice(), 200);
    }
    window.responsiveVoice.init();
    console.debug('= ResponsiveVoice init OK')
  }

  checkResponsiveVoiceAPIKey() {
    this.socketRV.emit('get.value', 'key', (err, value) => {
      if (this.responsiveAPIKey !== value) {
        // unload if values doesn't match
        this.$unloadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.responsiveAPIKey)
          .catch(() => {}); // skip error
        if (value.trim().length > 0) {
          this.$loadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + value)
            .then(() => {
              this.responsiveAPIKey = value;
              this.initResponsiveVoice();
              setTimeout(() => this.checkResponsiveVoiceAPIKey(), 1000);
            });
        } else {
          console.debug('TTS disabled, responsiveVoice key is not set')
          this.responsiveAPIKey = value;
          setTimeout(() => this.checkResponsiveVoiceAPIKey(), 1000);
        }
      }
      setTimeout(() => this.checkResponsiveVoiceAPIKey(), 1000);
    })
  }

  created () {
    this.checkResponsiveVoiceAPIKey();
    setInterval(() => {
      this.socket.emit('randomizer::getVisible', async (err, data) => {
        if (err) {
          return console.error(err)
        }
        if (!data) {
          this.data = null;
          return;
        }
        if (data.items.length === 0) {
          console.error('No items detected in your randomizer');
          return;
        }

        const head = document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
        style.type = 'text/css';
        if (!this.loadedFonts.includes(data.customizationFont.family)) {
          console.debug('Loading font', data.customizationFont.family)
          this.loadedFonts.push(data.customizationFont.family)
          const font = data.customizationFont.family.replace(/ /g, '+')
          const css = "@import url('https://fonts.googleapis.com/css?family=" + font + "');"
          style.appendChild(document.createTextNode(css));
          head.appendChild(style);
        }

        let shouldReinitWof = false;
        if (!isEqual(data, this.data)) {
          this.showSimpleValueIndex = Math.floor(Math.random() * this.generateItems(data.items).length);
          shouldReinitWof = true;
          this.data = data;
        }

        this.$nextTick(() => {
          if (shouldReinitWof && data.type === 'wheelOfFortune') {
            function playSound() {
              if (data.shouldPlayTick) {
                const audio = new Audio(defaultTick.default);
                audio.volume = data.tickVolume / 100;
                audio.play();
              }
            }

            let segments = new Array()
            for (let option of this.generateItems(data.items)) {
              segments.push({'fillStyle': option.color, 'textFillStyle': getContrastColor(option.color), 'text': option.name})
            }

            gsap.to(this.$refs["pointer"], { duration: 1.5, opacity: 1 })
            gsap.to(this.$refs["canvas"], { duration: 1.5, opacity: 1 })

            this.theWheel = new Winwheel({
              'numSegments'  : this.generateItems(data.items).length, // Number of segments
              'outerRadius'  : 450,                 // The size of the wheel.
              'centerX'      : 960,                 // Used to position on the background correctly.
              'centerY'      : 540,
              'textFontSize' : data.customizationFont.size,                  // Font size.
              'segments'     : segments,
              'responsive'   : true,  // This wheel is responsive!
              'animation'    :                      // Definition of the animation
              {
                'type'     : 'spinToStop',
                'duration' : 10,
                'spins'    : 5,
                'easing'   : 'Back.easeOut.config(4)',
                'callbackFinished' : this.alertPrize,
                'callbackAfter' : this.drawTriangle,
                'callbackSound'    : playSound,   // Called when the tick sound is to be played.
                'soundTrigger'     : 'pin',        // Specify pins are to trigger the sound.
                'yoyo': true,
              },
                'pins' :                // Turn pins on.
                {
                    'number'     : 12,
                    'fillStyle'  : 'silver',
                    'outerRadius': 4,
                }
            });
            theWheel = this.theWheel;
            this.drawTriangle();
          }
        })
      })
    }, 1000)
    this.socket.on('spin', this.spin);
  }

  alertPrize() {
    this.wheelWin = this.theWheel.getIndicatedSegment();
    setTimeout(() => {
      if (this.data && this.data.tts.enabled && this.wheelWin) {
        this.speak(this.wheelWin.text, this.data.tts.voice, this.data.tts.rate, this.data.tts.pitch, this.data.tts.volume);
      }
    }, 1000);
    setTimeout(() => {
      this.wheelWin = null;
    }, 5000)
  }

  drawTriangle() {
    let ctx = theWheel.ctx;
    ctx.strokeStyle = 'navy';     // Set line colour.
    ctx.fillStyle   = 'aqua';     // Set fill colour.
    ctx.lineWidth   = 2;
    ctx.beginPath();              // Begin path.

    const positionX = 945;
    const positionY = 80;
    ctx.moveTo(positionX, positionY);           // Move to initial position.
    ctx.lineTo(positionX + 30, positionY);           // Draw lines to make the shape.
    ctx.lineTo(positionX + 15, positionY + 15);
    ctx.lineTo(positionX + 1, positionY);
    ctx.stroke();                 // Complete the path by stroking (draw lines).
    ctx.fill();                   // Then fill.
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

  spin() {
    if (this.data !== null) {
      if (this.data.type === 'wheelOfFortune' && this.theWheel) {
        this.theWheel.rotationAngle = this.theWheel.rotationAngle % 360 // reset angle
        this.theWheel.startAnimation();
      }
      if (this.data.type === 'simple') {
        if (this.showSimpleLoop > 0) {
          return; // do nothing if in progress
        }
        this.showSimpleLoop = 500 + Math.floor(Math.random() * this.generateItems(this.data.items).length);
        this.showSimpleSpeed = 1;
        const blink = () => {
          if (this.showSimpleLoop > -10) {
            this.showSimpleBlink = !this.showSimpleBlink;
            this.showSimpleLoop--;
            setTimeout(blink, 100);
          } else {
            this.showSimpleBlink = true;
          }
        }
        const next = () => {
          if (this.data === null) {
            return;
          }
          if (this.showSimpleLoop > 300) {
            this.showSimpleSpeed = 5;
          } else if (this.showSimpleLoop > 80) {
            this.showSimpleSpeed = 10;
          } else if (this.showSimpleLoop > 60) {
            this.showSimpleSpeed = 30;
          } else if (this.showSimpleLoop > 40) {
            this.showSimpleSpeed = 50;
          } else if (this.showSimpleLoop > 30) {
            this.showSimpleSpeed = 75;
          } else if (this.showSimpleLoop > 20) {
            this.showSimpleSpeed = 100;
          } else if (this.showSimpleLoop > 5) {
            this.showSimpleSpeed = 200;
          } else if (this.showSimpleLoop > 2) {
            this.showSimpleSpeed = 500;
          } else {
            this.showSimpleSpeed = 1000;
          }

          this.showSimpleValueIndex++;
          if (typeof this.generateItems(this.data.items)[this.showSimpleValueIndex] === 'undefined') {
            this.showSimpleValueIndex = 0;
          }
          this.showSimpleLoop--;
          if (this.showSimpleLoop > 0) {
            setTimeout(next, this.showSimpleSpeed)
          } else {
            setTimeout(Math.random() > 0.3 ? blink : next, this.showSimpleSpeed) // move one a bit if lucky or not
          }
        }
        next();
      }
    }
  }

  generateItems(items: Required<RandomizerItemInterface>[], generatedItems: Required<RandomizerItemInterface>[] = []) {
    const beforeItems = cloneDeep(items);
    items = cloneDeep(items);
    items = items.filter(o => o.numOfDuplicates > 0);


    const countGroupItems = (item: RandomizerItemInterface, count = 0) => {
      const child = items.find(o => o.groupId === item.id);
      if (child) {
        return countGroupItems(child, count + 1);
      } else {
        return count;
      }
    }
    const haveMinimalSpacing = (item: Required<RandomizerItemInterface>) => {
      let lastIdx = generatedItems.map(o => o.name).lastIndexOf(item.name);
      const currentIdx = generatedItems.length;
      return lastIdx === -1 || lastIdx + item.minimalSpacing + countGroupItems(item) < currentIdx
    }
    const addGroupItems = (item: RandomizerItemInterface, generatedItems: RandomizerItemInterface[]) => {
      const child = items.find(o => o.groupId === item.id);
      if (child) {
        generatedItems.push(child);
        addGroupItems(child, generatedItems);
      }
    }

    for (const item of items) {

      if (item.numOfDuplicates > 0 && haveMinimalSpacing(item) && !item.groupId /* is not grouped or is parent of group */) {
        generatedItems.push(item);
        item.numOfDuplicates--;
        addGroupItems(item, generatedItems);
      }
    }

    // run next iteration if some items are still there and that any change was made
    // so we don't have infinite loop when e.g. minimalspacing is not satisfied
    if (items.filter(o => o.numOfDuplicates > 0).length > 0 && !isEqual(items.filter(o => o.numOfDuplicates > 0), beforeItems)) {
      this.generateItems(items, generatedItems);
    }
    return generatedItems;
  }
}
</script>

<style scoped>
  #canvas { opacity: 0; }
  #winbox {
    text-align:center;
    position:absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    height: auto;

  }
</style>