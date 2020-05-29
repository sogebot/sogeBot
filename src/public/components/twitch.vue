<template>
  <b-container fluid class="w-100 p-0" style="height: calc(100vh - 40px) !important">
    <b-row no-gutters style="height: 100%">
      <b-col cols="12" md="9" lg="9" xl="10">
        <iframe
          :src="'https://player.twitch.tv/?channel=' + room"
          height="100%"
          width="100%"
          frameborder="0"
          scrolling="no"
          allowfullscreen="true">
        </iframe>
      </b-col>
      <b-col cols="0" md="3" lg="3" xl="2">
        <iframe frameborder="0"
          scrolling="no"
          :src="chatUrl"
          height="100%"
          width="100%">
        </iframe>
      </b-col>
    </b-row>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { get } from 'lodash-es';

@Component({})
export default class navbar extends Vue {
  socket = getSocket('/widgets/chat', true);
  room = '';
  refresh = false;
  theme = 'light';

  mounted() {
    this.socket.emit('room', (err: string | null, room: string) => {
      this.room = room;
    })

    setInterval(() => {
      this.theme = (localStorage.getItem('theme') || get(Vue, 'prototype.configuration.core.ui.theme', 'light'));
    }, 100)
  }

  get chatUrl() {
    return window.location.protocol
      + '//twitch.tv/embed/'
      + this.room
      + '/chat'
      + (this.theme === 'dark' ? '?darkpopout' : '')
  }
}
</script>