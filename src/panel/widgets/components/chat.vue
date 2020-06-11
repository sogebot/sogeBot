<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-chat')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item(target="_blank" href="/popout/#chat")
                  | Popout
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'chat'))").text-danger
                    | Remove <strong>{{translate('widget-title-chat')}}</strong> widget
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-chat') }}

        b-tab(active)
          template(v-slot:title)
            fa(icon='comment-alt' fixed-width)
          b-card-text.h-100
            div.h-100
              iframe(
                v-if="show"
                frameborder="0"
                scrolling="no"
                :src="chatUrl"
                width="100%"
                style="height: calc(100% - 40px)"
              )
            div(style='margin-top: -40px;')
              div.form-row
                b-col
                  input(type="text" v-model="chatMessage" :placeholder="translate('send-message-as-a-bot')").form-control
                b-col
                  button(@click="sendChatMessage()").form-control.btn.btn-primary {{ translate('chat-as-bot') }}

        b-tab
          template(v-slot:title)
            fa(icon="users" fixed-width)
          b-card-text
            ul(style="list-style-type: none; -webkit-column-count: 3; -moz-column-count: 3; column-count: 3; margin: 0;")
              li(v-for="chatter of chatters" :key="chatter") {{chatter}}

        template(v-slot:tabs-end)
          b-nav-item(href="#" @click="refresh")
            fa(icon="sync-alt" v-if="!isRefreshing" fixed-width)
            fa(icon="sync-alt" spin v-else fixed-width)
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { sortedUniq, flatten } from 'lodash-es';
import { EventBus } from 'src/panel/helpers/event-bus';
import { get } from 'lodash-es';
import Vue from 'vue';

export default {
  props: ['popout', 'nodrag'],
  data: function () {
    return {
      theme: 'light',
      socket: getSocket('/widgets/chat'),
      chatMessage: '',
      chatters: [],
      isRefreshing: false,
      room: '',
      interval: [],
      EventBus,
      show: true,
    }
  },

  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  },
  computed: {
    chatUrl() {
      return window.location.protocol
        + '//twitch.tv/embed/'
        + this.room
        + '/chat'
        + (this.theme === 'dark' ? '?darkpopout' : '')
        + (this.theme === 'dark' ? '&parent=' + window.location.hostname : '?parent=' + window.location.hostname)
    }
  },
  methods: {
    refresh: function (event) {
      this.show = false;
      this.$nextTick(() => this.show = true);
    },
    sendChatMessage: function () {
      if (this.chatMessage.length > 0) this.socket.emit('chat.message.send', this.chatMessage)
      this.chatMessage = ''
    },
    _chatters() {
      if (this.room.length > 0) {
        this.socket.emit('viewers', (err, data) => {
          if (err) return console.error('Server error', err)

          let chatters = []
          for (let chatter of Object.entries(data.chatters).map(o => o[1])) {
            chatters.push(chatter)
          }
          this.chatters = sortedUniq(flatten(chatters))
        })
      }
    }
  },
  created: function () {
    this.interval.push(setInterval(() => {
      this._chatters();
    }, 60000));

    this.socket.emit('room', (err, room) => {
      if (err) return console.error(err)
      this.room = room
      this._chatters();
    })

    this.interval.push(setInterval(() => {
      this.theme = (localStorage.getItem('theme') || get(Vue, 'prototype.configuration.core.ui.theme', 'light'));
    }, 100));
  }
}
</script>
