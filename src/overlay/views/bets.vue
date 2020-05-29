<template>
  <div>
    <transition name="fade">
      <div id="bet" v-if="currentBet" v-show="currentBet && !currentBet.isLocked">
        <strong class="title">{{currentBet.title}}</strong>
        <strong class="timer">
          <span style="color: red" v-if="this.timeToEnd < 1">&lt;1min</span>
          <span v-else>{{this.timeToEnd}}min</span>
        </strong>
        <div id="options">
          <div v-for="(option, index) in currentBet.options" :key="option">
            <div class="title">{{index + 1}} ... {{option}}</div>
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
import { getSocket } from 'src/panel/helpers/socket';
import { BetsInterface } from 'src/bot/database/entity/bets';

@Component({})
export default class BetsOverlay extends Vue {
  socket = getSocket('/overlays/bets', true);
  colors = [ 'blue', 'red', 'orange', 'green', 'purple', 'yellow', 'pink', 'cyan' ];
  currentBet: Required<BetsInterface> | null = null;

  get timeToEnd() {
    if (this.currentBet && !this.currentBet.isLocked) {
      return Math.floor(Math.floor((this.currentBet.endedAt - Date.now()) / 1000) / 60)
    } else {
      return 0;
    }
  }

  created() {
    this.refresh();
  }

  getPercentage(index: number) {
    if (this.currentBet && this.currentBet.participations.length > 0) {
      return this.currentBet.participations
        .filter(o => Number(o.optionIdx) === Number(index)).length / (this.currentBet.participations.length / 100);
    } else {
      return 0;
    }
  }

  getColor(index: number): string {
    if (typeof this.colors[index] === 'undefined') {
      return this.getColor(index - this.colors.length);
    } else {
      return this.colors[index];
    }
  }

  refresh() {
    this.socket.emit('data', (currentBet: Required<BetsInterface>) => {
      this.currentBet = currentBet ?? null;
      console.log({currentBet});
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