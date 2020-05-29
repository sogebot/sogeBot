<template>
<span id="stats">
  <span class="item viewers">
    <font-awesome-icon icon="eye" />
    <span>{{ stats.uptime === '00:00:00' ? '0' : stats.viewers }}</span>
    <span class="text"></span>
  </span>

  <span class="item uptime">
    <font-awesome-icon icon="clock" />
    <span>{{ stats.uptime }}</span>
    <span class="text"></span>
  </span>

  <span class="item followers">
    <font-awesome-icon icon="users" />
    <span>{{ stats.uptime === '00:00:00' ? '0' : stats.followers }}</span>
    <span class="text"></span>
  </span>

  <span class="item subscribers">
    <font-awesome-icon icon="star" />
    <span>{{ stats.uptime === '00:00:00' ? '0' : stats.subscribers }}</span>
    <span class="text"></span>
  </span>

  <span class="item bits">
    <font-awesome-icon icon="gem" />
    <span>{{ stats.uptime === '00:00:00' ? '0' : stats.bits }}</span>
    <span class="text"></span>
  </span>
</span>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faStar, faGem, faUsers, faClock, faEye } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getSocket } from 'src/panel/helpers/socket';

library.add(faStar, faGem, faUsers, faClock, faEye)

@Component({
  components: {
    'font-awesome-icon': FontAwesomeIcon
  }
})
export default class StatsOverlay extends Vue {
  socket = getSocket('/overlays/stats', true);
  stats: any = {};
  interval: any[] = []

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  created () {
    this.refresh()
    this.interval.push(setInterval(() => this.refresh(), 1000));
  }

  refresh () {
    this.socket.emit('get', (cb: any) => {
      this.stats = cb
    })
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