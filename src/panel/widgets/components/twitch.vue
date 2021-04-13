<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-twitch')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item(target="_blank" href="/popout/#twitch")
                  | {{ translate('popout') }}
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'twitch'))" class="text-danger"
                    v-html="translate('remove-widget').replace('$name', translate('widget-title-twitch'))")
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-twitch') }}

        b-tab(active)
          template(v-slot:title)
            fa(:icon="['fab', 'twitch']")
          b-card-text.h-100
            div.h-100
              b-alert(variant="danger" v-if="!isHttps" show)
                | You need to run bot on HTTPS on port 443 with valid certificate for this embed to be working
              iframe(
                v-else-if="show"
                style="width: 100%; height: 100%"
                :src="videoUrl"
                frameborder="0"
              )

        template(v-slot:tabs-end)
          b-nav-item(href="#" @click="refresh")
            fa(icon="sync-alt" v-if="!isRefreshing" fixed-width)
            fa(icon="sync-alt" spin v-else fixed-width)
</template>

<script>
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';

import { EventBus } from 'src/panel/helpers/event-bus';

export default {
  props: ['popout', 'nodrag'],
  data:  function () {
    return {
      EventBus,
      translate,
      socket:       getSocket('/core/twitch'),
      room:         '',
      show:         true,
      isRefreshing: false,
    };
  },
  computed: {
    isHttps() {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isSecureHttp = window.location.protocol === 'https:';
      const isCorrectPort = ['', '443'].includes(window.location.port) && window.location.protocol === 'https:';
      return isLocalhost || (isSecureHttp && isCorrectPort);
    },
    videoUrl() {
      return `${window.location.protocol}//player.twitch.tv/?channel=${this.room}&autoplay=true&muted=true&parent=${window.location.hostname}`;
    },
  },
  created: function () {
    this.socket.emit('broadcaster', (err, room) => {
      if (err) {
        return console.error(err);
      }
      this.room = room;
    });
  },
  mounted: function () {
    this.$emit('mounted');
  },
  methods: {
    refresh: function (event) {
      this.show = false;
      this.$nextTick(() => this.show = true);
    },
  },
};
</script>
