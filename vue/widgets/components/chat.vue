<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#chat-room-panel" aria-controls="home" role="tab" data-toggle="tab" title="Chat room">
          <i class="fas fa-comment-alt" aria-hidden="true"></i>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#chat-viewers-panel" aria-controls="home" role="tab" data-toggle="tab" title="Viewer list">
          <i class="fas fa-users" aria-hidden="true"></i>
        </a>
      </li>
      <li role="presentation" class="nav-item widget-popout">
        <a class="nav-link" title="Popout" target="_blank" href="/popout/#chat">
          <i class="fas fa-external-link-alt"></i>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title" data-lang="widget-title-chat"></h6>
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
  props: ['socket', 'commons'],
  data: function () {
    return {
      chatMessage: '',
      chatters: []
    }
  },
  methods: {
    sendChatMessage: function () {
      if (this.chatMessage.length > 0) this.socket.emit('chat.message.send', this.chatMessage)
      this.chatMessage = ''
    }
  },
  created: function () {
    this.socket.on('chatChatters', (data) => {
      let chatters = []
      for (let chatter of Object.entries(data.chatters)) {
        chatters.push(chatter[1])
      }
      this.chatters = _.sortedUniq(_.flatten(chatters))
    })

    this.socket.emit('getChatRoom');
    this.socket.once('chatRoom', function (room) {
      $("#chat-room").html('<iframe frameborder="0" scrolling="no" id="chat_embed" src="' + window.location.protocol +
        '//twitch.tv/embed/' + room + '/chat" width="100%"></iframe>')
    })
  }
}
</script>
