<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#cmdboard-main" aria-controls="home" role="tab" data-toggle="tab" title="CommandBoard">
          <fa icon="terminal" />
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#cmdboard-settings" aria-controls="home" role="tab" data-toggle="tab" title="Settings">
          <fa icon="cog" />
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{commons.translate('widget-title-cmdboard')}}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" style="overflow: auto" class="tab-pane active" id="cmdboard-main">
        <div class="list-group" style="flex-flow: wrap; display: flex;" v-if="displayAs === 'grid'">
          <button
            class="list-group-item list-group-item-action cmdboard-list-group-item"
            style="width: 50%; text-overflow: ellipsis; height: 3.1rem;"
            v-for="item of items"
            v-on:click="emit(item)"
            :data-name="item.text"
            :key="item._id"
            :title="item.command">
            <span style="overflow: hidden; display: inline-block; word-break: break-all; height: 30px;">
              {{item.text}}
              <small>{{item.command}}</small>
            </span>
          </button>
        </div>
        <div v-else class="list-group" style="flex-flow: column wrap; display: flex;">
          <button
            class="list-group-item list-group-item-action cmdboard-list-group-item"
            style="width: 100%; text-overflow: ellipsis; height: 3.1rem;"
            v-for="item of items"
            v-on:click="emit(item)"
            :data-name="item.text"
            :key="item._id"
            :title="item.command">
            <span style="overflow: hidden; display: inline-block; word-break: break-all; height: 30px;">
              {{item.text}}
              <small>{{item.command}}</small>
            </span>
          </button>
        </div>
      </div>
      <!-- /MAIN -->

      <div role="tabpanel" class="tab-pane" id="cmdboard-settings">
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">{{commons.translate('name')}}</span>
          </div>
          <input type="text" class="form-control" v-model="name">
        </div>
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">{{commons.translate('command')}}</span>
          </div>
          <input type="text" class="form-control" v-model="command">
        </div>
        <button type="button" class="btn btn-success btn-block btn-cmdboard" v-on:click="add" :disabled="!isConfirmEnabled">{{commons.translate('confirm')}}</button>

        <div class="input-group pt-2">
          <div class="input-group-prepend">
            <span class="input-group-text">{{commons.translate('display-as')}}</span>
          </div>
          <div class="btn-group btn-group-toggle d-flex" data-toggle="buttons" style="flex: 1 auto;">
            <label
              v-for="o of displayAsOpts"
              :key="o"
              class="btn btn-secondary text-capitalize"
              :class="[ displayAs === o ? 'active' : '']"
              style="flex: 1 auto;"
              v-on:click="displayAs = o">
              <input type="radio" name="options" autocomplete="off" :checked="displayAs === o"> {{o}}
            </label>
          </div>
        </div>
      </div>
      <!-- /SETTINGS -->
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['commons'],
  data: function () {
    return {
      socket: io('/widgets/cmdboard', { query: "token=" + this.token }),
      displayAs: 'list',
      displayAsOpts: [],
      name: '',
      command: '',
      items: []
    }
  },
  computed: {
    isConfirmEnabled: function () {
      return this.name.trim().length > 0 && this.command.trim().length > 0
    }
  },
  watch: {
    displayAs: function (val) {
      this.socket.emit('settings.update', { displayAs: val })
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
  updated: function () {
    new BootstrapMenu(".cmdboard-list-group-item", {
      fetchElementData: ($el) => {
        return $el.data();
      },
      actions: [{
        name: 'Delete',
        classNames: ['action-danger'],
        iconClass: 'fa-trash-alt',
        onClick: (data) => {
          this.socket.emit('cmdboard.widget.remove', data, (items) => {
            this.items = items
          })
        }
      }]
    })
  },
  created: function () {
      this.socket.emit('cmdboard.widget.fetch', (items) => {
        this.items = items
      })
      this.socket.emit('settings', (err, data) => {
        if (err) return console.error(err)
        this.displayAs = data.displayAs
        this.displayAsOpts = data.displayAsOpts
      })
  },
  methods: {
    emit: function (item) {
      this.socket.emit('cmdboard.widget.run', item.command)
    },
    add: function () {
      $('a[href="#cmdboard-main"]').tab('show')
      this.socket.emit('cmdboard.widget.add', {
        name: this.name,
        command: this.command
      }, (items) => {
        this.items = items
      })
      this.name = ''
      this.command = ''
    }
  }
}
</script>
