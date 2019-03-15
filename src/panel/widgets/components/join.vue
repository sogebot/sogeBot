<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#join-part-list-panel" aria-controls="home" role="tab" data-toggle="tab" title="Join/Part list">
          <fa icon="sign-in-alt"></fa>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{commons.translate('widget-title-join')}}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="join-part-list-panel">
        {{ joined }}
      </div>
      <!-- /JOIN/PART LIST -->
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['commons'],
  data: function () {
    return {
      socket: io('/widgets/joinpart', { query: "token=" + this.token }),
      list: []
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
  computed: {
    joined: function () {
      let list = _(this.list.filter(o => o.type === 'join').sort(o => -(new Date(o.createdAt).getTime()))).chunk(30).value()[0]
      return list ? list.map(o => o.username).join(', ') : ''
    }
  },
  created: function () {
    this.socket.on('joinpart', (data) => {
      data.createdAt = new Date()
      this.list.push(data)
    })
  }
}
</script>
