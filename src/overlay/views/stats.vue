<template>
  <span id="stats">
    <span class="item viewers">
      <font-awesome-icon icon="eye" />
      <span>{{ stats.uptime === '00:00:00' ? '0' : stats.viewers }}</span>
      <span class="text" />
    </span>

    <span class="item uptime">
      <font-awesome-icon icon="clock" />
      <span>{{ stats.uptime }}</span>
      <span class="text" />
    </span>

    <span class="item followers">
      <font-awesome-icon icon="users" />
      <span>{{ stats.uptime === '00:00:00' ? '0' : stats.followers }}</span>
      <span class="text" />
    </span>

    <span class="item subscribers">
      <font-awesome-icon icon="star" />
      <span>{{ stats.uptime === '00:00:00' ? '0' : stats.subscribers }}</span>
      <span class="text" />
    </span>

    <span class="item bits">
      <font-awesome-icon icon="gem" />
      <span>{{ stats.uptime === '00:00:00' ? '0' : stats.bits }}</span>
      <span class="text" />
    </span>
  </span>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faUsers } from '@fortawesome/free-solid-svg-icons/faUsers';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { getSocket } from '@sogebot/ui-helpers/socket';
import { Component, Vue } from 'vue-property-decorator';

library.add(faStar, faGem, faUsers, faClock, faEye);

@Component({ components: { 'font-awesome-icon': FontAwesomeIcon } })
export default class StatsOverlay extends Vue {
  socket = getSocket('/overlays/stats', true);
  stats: any = {};
  interval: any[] = [];

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  created () {
    this.refresh();
    this.interval.push(setInterval(() => this.refresh(), 1000));
  }

  refresh () {
    this.socket.emit('get', (cb: any) => {
      this.stats = cb;
    });
  }
}
</script>

<style>
  #stats {
    position: relative;
    top: 5px;
    background-color: rgba(50,50,50,0.4);
    padding: 3px;
    width: auto;
    text-shadow: 0 0 2px #000, 0 0 4px #888, 0 0 8px #888;
    color: white;
    font-size: 20px;
  }

  span.item {
    padding-left: 5px;
  }

  i {
    margin-left: 10px;
  }
</style>