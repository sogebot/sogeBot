<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#chat-room-panel" aria-controls="home" role="tab" data-toggle="tab" title="Chat room">
          <fa icon="comment-alt" />
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#chat-viewers-panel" aria-controls="home" role="tab" data-toggle="tab" title="Viewer list">
          <fa icon="users" />
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a href="#" class="nav-link" title="Refresh" @click="refresh">
          <fa icon="sync-alt" v-if="!isRefreshing"/>
          <fa icon="sync-alt" spin v-else/>
        </a>
      </li>
      <li role="presentation" class="nav-item widget-popout" v-if="!popout">
        <a class="nav-link" title="Popout" target="_blank" href="/popout/#chat">
          <fa icon="external-link-alt" />
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{ commons.translate('widget-title-chat') }}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="chat-room-panel">
        <div id="chat-room" style="height: 100%"></div>

        <div style="margin-top: -40px;">
          <div class="form-row">
            <div class="col">
              <input type="text" v-model="chatMessage" class="form-control" v-bind:placeholder="commons.translate('send-message-as-a-bot')" />
            </div>
            <div class="col">
              <button v-on:click="sendChatMessage()" class="form-control btn btn-primary">{{ commons.translate('chat-as-bot') }}</button>
            </div>
          </div>
        </div>
      </div>
      <!-- /CHAT-ROOM -->

      <div role="tabpanel" class="tab-pane" id="chat-viewers-panel">
        <div id="chat-viewers">
          <ul style="list-style-type: none; -webkit-column-count: 3; -moz-column-count: 3; column-count: 3; margin: 0;" id="chat-viewers-data">
            <li v-for="chatter of chatters" :key="chatter">{{chatter}}</li>
          </ul>
        </div>
      </div>
      <!-- /VIEWER LIST -->
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['commons', 'popout', 'configuration'],
  data: function () {
    return {
      socket: io('/widgets/chat', { query: "token=" + this.token }),
      chatMessage: '',
      chatters: [],
      isRefreshing: false,
      room: ''
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
  methods: {
    refresh: function (event) {
      if (event) event.preventDefault()
      this.isRefreshing = true
      setTimeout(() => (this.isRefreshing = false), 2000)
      $("#chat-room").empty()
      $("#chat-room").html('<iframe frameborder="0" scrolling="no" id="chat_embed" src="' + window.location.protocol +
        '//twitch.tv/embed/' + this.room + '/chat' + (configuration.core.ui.theme.includes('dark') ? '?darkpopout' : '') +'" width="100%"></iframe>')
    },
    sendChatMessage: function () {
      if (this.chatMessage.length > 0) this.socket.emit('chat.message.send', this.chatMessage)
      this.chatMessage = ''
    },
    _chatters() {
      this.socket.emit('viewers', (err, data) => {
        if (err) return console.error(err)

        let chatters = []
        for (let chatter of Object.entries(data.chatters).map(o => o[1])) {
          chatters.push(chatter)
        }
        this.chatters = _.sortedUniq(_.flatten(chatters))
      })
    }
  },
  created: function () {
    this._chatters();
    setInterval(() => this._chatters(), 60000);

    this.socket.emit('room', (err, room) => {
      if (err) return console.error(err)
      this.room = room
      $("#chat-room").html('<iframe frameborder="0" scrolling="no" id="chat_embed" src="' + window.location.protocol +
        '//twitch.tv/embed/' + room + '/chat' + (configuration.core.ui.theme.includes('dark') ? '?darkpopout' : '') +'" width="100%"></iframe>')
    })
  }
}
</script>
