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
import { getSocket } from 'src/panel/helpers/socket';
import { orderBy } from 'lodash-es';

@Component({})
export default class ClipsOverlay extends Vue {
  socket = getSocket('/overlays/eventlist', true);
  events: any[] = [];
  created () {
    setTimeout(() => this.refresh(), 1000);
  }
  refresh() {
    this.socket.emit('getEvents', {
      ignore: this.urlParam('ignore') || '',
      limit: Number(this.urlParam('count') || 5)
    }, (data) => {
      var order = (this.urlParam('order') as "desc" | "asc") || 'desc'
      var display: string | string[] = this.urlParam('display') || 'username,event'; display = display.split(',')

      console.debug({order, display})

      data = orderBy(data, 'timestamp', order) // re-order as set in order
      for (let event of data) {
        const values = JSON.parse(event.values_json);
        if (event.event === 'resub') {
          event.summary = values.subCumulativeMonths + 'x ' + this.translate('overlays-eventlist-resub')
        } else if (event.event === 'cheer') {
          event.summary = values.bits + ' ' + this.translate('overlays-eventlist-cheer')
        } else if (event.event === 'tip') {
          event.summary = values.currency + parseFloat(values.amount).toFixed(2)
        } else {
          event.summary = this.translate('overlays-eventlist-' + event.event)
        }
      }
      this.events = data
      setTimeout(() => this.refresh(), 5000);
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