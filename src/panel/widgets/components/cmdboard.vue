<template>
  <div class="widget">
    <b-card class="border-0 h-100" no-body>
      <b-tabs pills card class="h-100" style="overflow:hidden">
        <template v-slot:tabs-start v-if="!popout">
          <li class="nav-item px-2 grip text-secondary align-self-center">
            <fa icon="grip-vertical" fixed-width/>
          </li>
          <li class="nav-item">
            <b-dropdown no-caret :text="translate('widget-title-cmdboard')" variant="outline-primary" ref="dropdown" toggle-class="border-0">
              <b-dropdown-item @click="state.editation = $state.progress">
                Edit actions
              </b-dropdown-item>
              <b-dropdown-item href="/popout/#cmdboard">
                Popout
              </b-dropdown-item>
              <b-dropdown-divider></b-dropdown-divider>
              <b-dropdown-item>
                <a href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'cmdboard'))" class="text-danger">
                  Remove <strong>{{translate('widget-title-cmdboard')}}</strong> widget
                </a>
              </b-dropdown-item>
            </b-dropdown>
          </li>
        </template>
        <b-tab active>
          <template v-slot:title>
            <fa icon="terminal" />
          </template>
          <b-card-text>
            <loading v-if="state.loading === $state.progress"/>
            <template v-else>
              <div v-if="state.editation === $state.progress" class="text-right">
                <b-button variant="danger" @click="remove" :disabled="selected.length === 0"><fa icon="trash-alt"/></b-button>
                <b-button variant="primary" @click="save">Done</b-button>
              </div>
              <div class="list-group" style="flex-flow: wrap; display: flex;">
                <b-row class="px-2">
                  <b-col v-for="item of orderBy(items, 'order')" :key="item._id" cols="6" class="p-1">
                    <button
                      v-on:dragenter="dragenter(item.order, $event)"
                      :ref='"item_" + item.order'
                      class="list-group-item list-group-item-action block px-2"
                      :class="{'list-group-item-danger': state.editation === $state.progress && selected.includes(item._id) }"
                      style="text-overflow: ellipsis;"
                      v-on:click="state.editation === $state.idle ? emit(item) : toggle(item)"
                      :data-name="item.text"
                      :title="item.command">
                      <span style="overflow: hidden; display: inline-block; word-break: break-all;line-height: 11px;">
                        <span
                          v-if="state.editation === $state.progress"
                          class="text-secondary"
                          style="cursor: grab;"
                          v-on:dragstart="dragstart(item.order, $event)"
                          v-on:dragend="dragend(item.order, $event)"
                          draggable="true">
                          <fa icon="grip-vertical" fixed-width/></span>
                        {{item.text}}
                      </span>
                    </button>
                  </b-col>
                </b-row>
              </div>
            </template>
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
          </b-card-text>
        </b-tab>
      </b-tabs>
    </b-card>
  </div>
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { orderBy } from 'lodash-es'

export default {
  props: ['popout'],
  components: {
    loading: () => import('src/panel/components/loading.vue'),
  },
  data: function () {
    return {
      orderBy,
      state: {
        editation: this.$state.idle,
        loading: this.$state.progress,
      },
      socket: getSocket('/widgets/cmdboard'),
      displayAs: 'list',
      displayAsOpts: [],
      name: '',
      command: '',
      items: [],
      selected: [],
      draggingItem: null,
    }
  },
  computed: {
    isConfirmEnabled: function () {
      return this.name.trim().length > 0 && this.command.trim().length > 0
    }
  },
  watch: {
    'state.editation': function (val) {
      this.selected = []
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
  created: function () {
      this.socket.emit('find', { collection: '_widgetsCmdBoard' }, (err, items) => {
        this.items = items
        this.state.loading = this.$state.success;
      })
      this.socket.emit('settings', (err, data) => {
        if (err) return console.error(err)
        this.displayAs = data.displayAs
        this.displayAsOpts = data.displayAsOpts
      })
  },
  methods: {
    toggle(item) {
      if(this.selected.find(o => o === item._id)) {
        this.selected = this.selected.filter(o => o !== item._id);
      } else {
        this.selected.push(item._id);
      }
    },
    reorder() {
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].order = i;
      }
    },
    remove() {
      this.items = this.items.filter(o => !this.selected.includes(String(o._id)))
      this.selected = [];
      this.reorder();
    },
    save() {
      this.state.editation = this.$state.idle;
      console.debug('saving', { items: Array(...this.items) })
      this.socket.emit('set', { collection: '_widgetsCmdBoard', items: this.items, where: {} })
    },
    emit: function (item) {
      this.socket.emit('cmdboard.widget.run', item.command)
    },
    add: function () {
      $('a[href="#cmdboard-main"]').tab('show')
      this.socket.emit('cmdboard.widget.add', {
        name: this.name,
        command: this.command,
        order: this.items.length,
      }, (items) => {
        this.items = items
      })
      this.name = ''
      this.command = ''
    },
    dragstart(order, e) {
      this.draggingItem = order;
      console.debug('dragging', order)
      this.$refs['item_' + order][0].style.opacity = 0.5;
      e.dataTransfer.setData('text/plain', 'dummy');
    },
    dragenter(newOrder, e) {
      const value = this.items.find(o => o.order === this.draggingItem)
      const entered = this.items.find(o => o.order === newOrder)
      entered.order = this.draggingItem;
      this.draggingItem = newOrder
      value.order = this.draggingItem;
      /*this.items.splice(this.draggingItem, 1);
      this.items.splice(newOrder, 0, value);
      this.draggingItem = newOrder;
*/
      for (let i = 0, length = this.items.length; i < length; i++) {
        this.$refs['item_' + this.items[i].order][0].style.opacity = 1;
      }
      this.$refs['item_' + this.draggingItem][0].style.opacity = 0.5;

      this.$forceUpdate()
    },
    dragend(order, e) {
      for (let i = 0, length = this.items.length; i < length; i++) {
        this.$refs['item_' + this.items[i].order][0].style.opacity = 1;
      }
    }
  }
}
</script>
