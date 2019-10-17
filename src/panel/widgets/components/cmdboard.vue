<template>
  <div class="widget">
    <b-card class="border-0 h-100" no-body>
      <b-tabs pills card class="h-100" style="overflow:hidden">
        <template v-slot:tabs-start>
          <li class="nav-item align-self-center pl-2">
            <h6 class="widget-title">
              {{translate('widget-title-cmdboard')}}
            </h6>
          </li>
        </template>
        <b-tab active>
          <template v-slot:title>
            <fa icon="terminal" />
          </template>
          <b-card-text>
            <div class="list-group" style="flex-flow: wrap; display: flex;" v-if="displayAs === 'grid'">
              <button
                class="list-group-item list-group-item-action" @contextmenu.prevent="$refs.menu.open($event, item)"
                style="width: 50%; text-overflow: ellipsis; height: 3.1rem;"
                v-for="(item) of items"
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
                class="list-group-item list-group-item-action" @contextmenu.prevent="$refs.menu.open($event, item)"
                style="width: 100%; text-overflow: ellipsis; height: 3.1rem;"
                v-for="(item) of items"
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

            <vue-context ref="menu"
                        :close-on-click="true"
                        :close-on-scroll="true">
              <template slot-scope="child">
                <li v-if="child.data">
                  <a href="#" @click.prevent="removeCommand(child.data)" class="text-danger">
                    <fa icon="trash-alt" class="mr-2" fixed-width/> Remove <strong>{{child.data.text}}</strong>
                  </a>
                </li>
              </template>
            </vue-context>
          </b-card-text>
        </b-tab>

        <b-tab>
          <template v-slot:title>
            <fa icon="cog" />
          </template>
          <b-card-text>
            <div class="input-group">
              <div class="input-group-prepend">
                <span class="input-group-text">{{translate('name')}}</span>
              </div>
              <input type="text" class="form-control" v-model="name">
            </div>
            <div class="input-group">
              <div class="input-group-prepend">
                <span class="input-group-text">{{translate('command')}}</span>
              </div>
              <input type="text" class="form-control" v-model="command">
            </div>
            <button type="button" class="btn btn-success btn-block btn-cmdboard" v-on:click="add" :disabled="!isConfirmEnabled">{{translate('confirm')}}</button>

            <div class="input-group pt-2">
              <div class="input-group-prepend">
                <span class="input-group-text">{{translate('display-as')}}</span>
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
          </b-card-text>
        </b-tab>
      </b-tabs>
    </b-card>
  </div>
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { VueContext } from 'vue-context';

export default {
  props: ['context'],
  components: {
    'vue-context': VueContext,
  },
  data: function () {
    return {
      socket: getSocket('/widgets/cmdboard'),
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
    removeCommand: function(data) {
      this.socket.emit('cmdboard.widget.remove', data, (items) => {
        this.items = items
      })
    },
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
