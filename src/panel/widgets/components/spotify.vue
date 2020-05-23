<template lang="pug">
  div.widget(ref="widget")
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-spotify')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'spotify'))" class="text-danger")
                    | Remove <strong>{{translate('widget-title-spotify')}}</strong> widget
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-spotify') }}
          li.nav-item
            hold-button(icon="list" @trigger="cleanupSongRequestList()").btn.btn-outline-danger.border-0.px-1
              template(v-slot:icon)
                font-awesome-layers
                  fa(icon="list" transform="left-3" fixed-width)
                  fa(icon="times" transform="shrink-8 down-9 right-9" fixed-width)

        b-tab(active)
          template(v-slot:title)
            fa(icon="list" fixed-width)
          b-card-text
            table.table.table-sm
              tr(v-for="(request, index) of requests" :key="index")
                td
                  hold-button(@trigger="removeSongRequest(String(index))" icon="times" class="btn-outline-danger btn-only-icon border-0")
                td {{request.song}}
                td {{request.artist}}
                td {{request.requestBy}}

        template(v-slot:tabs-end)
          li.nav-item
            button(@click="next").btn.btn-primary
              fa(icon="forward" fixed-width)
          li.nav-item
            button(@click="songRequestsEnabled = !songRequestsEnabled" :class="[songRequestsEnabled ? 'btn-outline-success' : 'btn-outline-danger']").btn.btn-outline-success.border-0
              template(v-if="widgetWidth < 400")
                | !
              template(v-else)
                fa(icon="check" fixed-width v-if="songRequestsEnabled")
                fa(icon="times" fixed-width v-else)
                | {{ command }}
          li.nav-item
            button(@click="continueOnPlaylistAfterRequest = !continueOnPlaylistAfterRequest" :class="[continueOnPlaylistAfterRequest ? 'btn-outline-success' : 'btn-outline-danger']").btn.btn-outline-success.border-0
              template(v-if="widgetWidth < 400")
                | P
              template(v-else)
                fa(icon="check" fixed-width v-if="continueOnPlaylistAfterRequest")
                fa(icon="times" fixed-width v-else)
                | PLAYLIST
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { EventBus } from 'src/panel/helpers/event-bus';
import { debounce } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faList, faTimes } from '@fortawesome/free-solid-svg-icons';
library.add(faList, faTimes);

export default {
  props: ['popout', 'nodrag'],
  components: {
    holdButton: () => import('../../components/holdButton.vue'),
    'font-awesome-layers': FontAwesomeLayers,
  },
  data: function () {
    return {
      EventBus,
      widgetWidth: 200,
      interval: 0,
      currentSong: {},
      requests: [],
      command: '!spotify',
      songRequestsEnabled: true,
      continueOnPlaylistAfterRequest: true,

      socket: getSocket('/integrations/spotify')
    }
  },
  watch: {
    songRequestsEnabled: debounce(function (val) {
      this.socket.emit('settings.update', { songRequests: val })
    }, 500),
    continueOnPlaylistAfterRequest: debounce(function (val) {
      this.socket.emit('settings.update', { output: { continueOnPlaylistAfterRequest: val } })
    }, 500)
  },
  methods: {
    next(index) {
      this.requests.splice(index, 1);
      this.socket.emit('spotify::skip', () => {});
    },
    cleanupSongRequestList() {
      this.requests = [];
      this.socket.emit('set.value', { variable: 'uris', value: this.requests }, () => {})
    },
    removeSongRequest(index) {
      this.requests.splice(index, 1)
      this.socket.emit('set.value', { variable: 'uris', value: this.requests }, () => {})
    },
    fetchCurrentSong() {
      this.socket.emit('get.value', 'currentSong', (err, v) => {
        this.currentSong = JSON.parse(v);
        setTimeout(this.fetchCurrentSong, 1000)
      })
    },
    fetchSongRequests() {
      this.socket.emit('get.value', 'uris', (err, v) => {
        this.requests = v
        setTimeout(this.fetchSongRequests, 1000)
      })
    }
  },
  beforeDestroy() {
    window.clearInterval(this.interval);
  },
  created: function () {
    this.interval = window.setInterval(() => {
      this.widgetWidth = this.$refs['widget'].clientWidth;
    }, 50)
    this.socket.emit('settings', (err, s) => {
      this.command = s.commands['!spotify'];
      this.songRequestsEnabled = s.songRequests;
      this.continueOnPlaylistAfterRequest = s.continueOnPlaylistAfterRequest;
      setTimeout(this.fetchCurrentSong, 1000)
      setTimeout(this.fetchSongRequests, 1000)
    })
  },
  mounted: function () {
    this.widgetWidth = this.$refs['widget'].clientWidth;
  }
}
</script>