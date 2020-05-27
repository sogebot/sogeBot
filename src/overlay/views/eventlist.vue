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
import { EventListInterface } from '../../bot/database/entity/eventList';

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
    }, (err: string | null, data: EventListInterface[]) => {
      if (err) {
        return console.error(err);
      }
      var order = (this.urlParam('order') as "desc" | "asc") || 'desc'
      var display: string | string[] = this.urlParam('display') || 'username,event'; display = display.split(',')

      console.debug({order, display})
      this.events = orderBy(data, 'timestamp', order).map((o) => {
        const values = JSON.parse(o.values_json);
        if (o.event === 'resub') {
          return { ...o, summary: values.subCumulativeMonths + 'x ' + this.translate('overlays-eventlist-resub') };
        } else if (o.event === 'cheer') {
          return { ...o, summary: values.bits + ' ' + this.translate('overlays-eventlist-cheer') };
        } else if (o.event === 'tip') {
          return { ...o, summary: values.currency + parseFloat(values.amount).toFixed(2) };
        } else {
          return { ...o, summary: this.translate('overlays-eventlist-' + o.event) };
        }
      })
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