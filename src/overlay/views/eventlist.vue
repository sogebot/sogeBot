<template>
<ul>
  <li
    v-for="event of events"
    :key="event._id"
    class="event"
    :class="[event.type]">
    <strong class="username">{{ event.username }}</strong>
    <span class="event">{{ event.summary }}</span>
  </li>
</ul>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import _ from 'lodash'
import io from 'socket.io-client';

@Component({})
export default class ClipsOverlay extends Vue {
  socket = io('/overlays/eventlist', {query: "token="+this.token});
  events: any[] = [];
  created () {
    this.socket.emit('get')
    this.socket.on('events', (data) => {
      var order = (this.urlParam('order') as "desc" | "asc") || 'desc'
      var display: string | string[] = this.urlParam('display') || 'username,event'; display = display.split(',')
      var ignore: string | string[] = this.urlParam('ignore') || ''; ignore = ignore.split(',')
      var count = Number(this.urlParam('count') || 5)

      console.debug({order, display, ignore, count})

      data = _.chunk(
        _.orderBy(
          // filter out ignored events
          _.filter(data, (o) => !_.includes(ignore, o.event))
          , 'timestamp', 'desc'), count)[0] // order by desc first to get chunk of data
      data = _.orderBy(data, 'timestamp', order) // re-order as set in order

      for (let event of data) {
        if (event.event === 'resub') event.summary = event.subCumulativeMonths + 'x ' + this.translate('overlays-eventlist-resub')
        else if (event.event === 'cheer') event.summary = event.bits + ' ' + this.translate('overlays-eventlist-cheer')
        else if (event.event === 'tip') event.summary = event.currency + parseFloat(event.amount).toFixed(2)
        else event.summary = this.translate('overlays-eventlist-' + event.event)
      }
      this.events = data
    })
  }
}
</script>

<style>
  @import url('https://fonts.googleapis.com/css?family=BenchNine');

  html, body {
    padding: 2px;
    padding-top: 10px;
    margin: auto;
    font-family: 'BenchNine', sans-serif;
    color: white;
  }

  ul {
    list-style-type: none;
    text-transform: uppercase;
    font-size: 1.6em;
    margin: 0;
    padding: 0;
    text-align: right;
  }

  ul li {
    width: 99%;
    margin-left: 0;
    text-shadow: 0 0 10px black, 0 0 20px black, 0 0 30px black;
  }

  ul li span {
    font-size: 0.6em;
  }

  ul li:nth-child(1) {
    opacity: 1;
    font-weight: bold;
  }

  ul li:nth-child(2) {
    opacity: 0.8;
  }

  ul li:nth-child(3) {
    opacity: 0.6;
  }

  ul li:nth-child(4) {
    opacity: 0.4;
  }

  ul li:nth-child(5) {
    opacity: 0.2;
  }
</style>