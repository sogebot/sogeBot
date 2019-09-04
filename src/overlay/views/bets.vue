<template>
  <div>
    <transition name="fade">
      <div id="bet" v-if="currentBet.title" v-show="isRunning">
        <strong class="title">{{currentBet.title}}</strong>
        <strong class="timer">
          <span style="color: red" v-if="this.timeToEnd < 1">&lt;1min</span>
          <span v-else>{{this.timeToEnd}}min</span>
        </strong>
        <div id="options">
          <div v-for="(option, index) in currentBet.options" :key="option.name">
            <div class="title">{{index}} ... {{option.name}}</div>
            <div class="percentage">{{getPercentage(index)}}%</div>
            <div class="bar"
              v-bind:style="{
                'background-color': getColor(index),
                'width': getPercentage(index) === 0 ? '5px' : getPercentage(index) + '%'
                }"
              style="height: 1.4em; ;"></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import io from 'socket.io-client';

@Component({})
export default class BetsOverlay extends Vue {
  isRunning: boolean = false;
  socket = io('/overlays/bets', { query: "token=" + this.token });
  colors = [ 'blue', 'red', 'orange', 'green', 'purple', 'yellow', 'pink', 'cyan' ];
  currentBet: any = {};
  bets: any[] = [];

  get timeToEnd() {
    if (this.isRunning) {
      return Math.floor(Math.floor((this.currentBet.end - Date.now()) / 1000) / 60)
    } else {
      return 0;
    }
  }

  created() {
    this.refresh();
  }

  getPercentage(index) {
    if (this.bets.length > 0) {
      return this.bets.filter(o => Number(o.option) === Number(index)).length / (this.bets.length / 100);
    } else {
      return 0;
    }
  }

  getColor(index) {
    if (typeof this.colors[index] === 'undefined') {
      return this.getColor(index - this.colors.length);
    } else {
      return this.colors[index];
    }
  }

  refresh() {
    this.socket.emit('data', (cb, bets) => {
      this.bets = bets
      this.currentBet = cb
      this.isRunning = typeof this.currentBet.end !== 'undefined' && Math.floor((this.currentBet.end - Date.now()) / 1000) > 0
      setTimeout(() => this.refresh(), 5000)
    })
  }
}
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css?family=Cabin');
  @import url('https://fonts.googleapis.com/css?family=Cabin+Condensed');

  #bet {
    font-family: 'Cabin';
    padding: 0.5em 1em;
    border: 3px solid rgba(40, 40, 40, 0.5);
    background-color: rgba(40, 40, 40, 0.5);
    color: white;
    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    text-transform: uppercase;
  }

  #bet > .title {
    font-weight: bold;
    font-size: 2em;
    color: orange;
  }

  #options > div > .title {
    font-size: 1.1em;
    font-weight: bold;
    z-index: 99999;
    padding-left: 0.5em;
    position: absolute;
  }

  #options > div > .bar {
    z-index: -1;
    margin-top: 0.2em;
    opacity: 0.5;
  }

  #options > div > .percentage {
    position: absolute;
    right: 2.5em;
    padding-top: 0.25em;
    z-index: 1;
    font-size: 0.8em;
    font-family: 'Cabin Condensed';
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 2s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
</style>