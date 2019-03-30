<template>
<span id="stats">
  <span class="item viewers">
    <font-awesome-icon icon="eye" />
    <span>{{ stats.viewers }}</span>
    <span class="text"></span>
  </span>

  <span class="item uptime">
    <font-awesome-icon icon="clock" />
    <span>{{ stats.uptime }}</span>
    <span class="text"></span>
  </span>

  <span class="item followers">
    <font-awesome-icon icon="users" />
    <span>{{ stats.followers }}</span>
    <span class="text"></span>
  </span>

  <span class="item subscribers">
    <font-awesome-icon icon="star" />
    <span>{{ stats.subscribers }}</span>
    <span class="text"></span>
  </span>

  <span class="item bits">
    <font-awesome-icon icon="gem" />
    <span>{{ stats.bits }}</span>
    <span class="text"></span>
  </span>
</span>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core'
import { faStar, faGem, faUsers, faClock, faEye } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import io from 'socket.io-client';

library.add(faStar, faGem, faUsers, faClock, faEye)

export default {
  props: ['token'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  data: function () {
    return {
      socket: io('/overlays/stats', {query: "token="+token}),
      stats: {}
    }
  },
  created: function () {
    this.refresh()
    setInterval(() => this.refresh(), 1000)
  },
  methods: {
    refresh: function () {
      this.socket.emit('get', (cb) => {
        this.stats = cb
      })
    }
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