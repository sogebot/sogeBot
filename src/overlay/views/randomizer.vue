<template>
<div>
  <div
    v-show="showSimpleBlink"
    v-if="data" :style="{
    color: generateItems(data.items)[showSimpleValueIndex].color,
    'font-size': data.customizationFont.size + 'px',
    'font-family': data.customizationFont.family,
    'text-align': 'center',
    'text-shadow': textStrokeGenerator(data.customizationFont.borderPx, data.customizationFont.borderColor)
    }">
    {{ generateItems(data.items)[showSimpleValueIndex].name }}
  </div>
</div>
</template>

<script lang="ts">
import type { RandomizerItemInterface, RandomizerInterface } from 'src/bot/database/entity/randomizer';

import { Vue, Component } from 'vue-property-decorator';
import { cloneDeep, isEqual } from 'lodash-es';

import { getSocket } from 'src/panel/helpers/socket';
import { getContrastColor } from 'src/panel/helpers/color';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSortDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faSortDown)

@Component({
  components: {
    'font-awesome-icon': FontAwesomeIcon
  }
})
export default class RandomizerOverlay extends Vue {
  getContrastColor = getContrastColor;

  loadedFonts: string[] = [];

  socket = getSocket('/registries/randomizer', true);
  data: Required<RandomizerInterface> | null = null;

  showSimpleValueIndex = 0;
  showSimpleSpeed = 1; // lower = faster
  showSimpleBlink = true;
  showSimpleLoop = 0;

  created () {
    setInterval(() => {
      this.socket.emit('randomizer::getVisible', async (err, data) => {
        if (err) {
          return console.error(err)
        }
        if (data.items.length === 0) {
          console.error('No items detected in your randomizer');
          return;
        }
        if (!isEqual(data, this.data)) {
          this.showSimpleValueIndex = Math.floor(Math.random() * this.generateItems(data.items).length);
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

        this.data = data;
      })
    }, 1000)
    setTimeout(this.spin, 3000);

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
      if (this.data.type === 'simple') {
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
            setTimeout(blink, this.showSimpleSpeed);
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
</style>
