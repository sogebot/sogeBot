<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#twitter-main" aria-controls="home" role="tab" data-toggle="tab" title="Send a twitch status">
          <fa :icon="['fab', 'twitter']" />
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{ commons.translate('widget-title-twitter') }}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="twitter-main">
        <div class="form-row">
          <div class="col">
            <input type="text" v-model="message" class="form-control" />
          </div>
          <div class="col-auto">
            <button on:click="send" class="form-control btn btn-primary">Tweet</button>
          </div>
        </div>
      </div>
      <!-- /MAIN -->
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['socket', 'commons'],
  data: function () {
    return { message: '' }
  },
  methods: {
    send: function () {
      if (this.message.length > 0) this.socket.emit('twitter.send', this.message)
      this.message = ''
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
}
</script>
