<template>
  <ul>
    <li
      v-for="event of events"
      :key="event._id"
      class="event"
      :class="[event.type]"
    >
      <template v-for="type of display">
        <strong
          v-if="type === 'username'"
          :key="type"
          class="username"
        >{{ event.username }}</strong>
        <span
          v-else
          :key="type"
          class="event"
        >{{ event.summary }}</span>
      </template>
    </li>
  </ul>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { orderBy } from 'lodash-es';
import { Component, Vue } from 'vue-property-decorator';

import { EventListInterface } from '../../bot/database/entity/eventList';

@Component({})
export default class ClipsOverlay extends Vue {
  socket = getSocket('/overlays/eventlist', true);
  events: any[] = [];
  display = ['username', 'event'];
  translate = translate;

  created () {
    setTimeout(() => this.refresh(), 1000);
  }
  refresh() {
    this.socket.emit('getEvents', {
      ignore: this.urlParam('ignore') || '',
      limit:  Number(this.urlParam('count') || 5),
    }, (err: string | null, data: EventListInterface[]) => {
      if (err) {
        return console.error(err);
      }
      const order = (this.urlParam('order') as 'desc' | 'asc') || 'desc';
      this.display = this.urlParam('display')?.split(',') || 'username,event'.split(',');

      console.debug({ order, display: this.display });
      this.events = orderBy(data, 'timestamp', order).map((o) => {
        const values = JSON.parse(o.values_json);
        if (o.event === 'resub') {
          return { ...o, summary: values.subCumulativeMonths + 'x ' + translate('overlays-eventlist-resub') };
        } else if (o.event === 'cheer') {
          return { ...o, summary: values.bits + ' ' + translate('overlays-eventlist-cheer') };
        } else if (o.event === 'tip') {
          return { ...o, summary: Intl.NumberFormat(this.$store.state.configuration.lang, { style: 'currency', currency: values.currency }).format(values.amount) };
        } else {
          return { ...o, summary: translate('overlays-eventlist-' + o.event) };
        }
      });
      setTimeout(() => this.refresh(), 5000);
    });
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

  .event {
    padding: 0 .2rem;
  }

  .username {
    padding: 0 .2rem;
  }
</style>