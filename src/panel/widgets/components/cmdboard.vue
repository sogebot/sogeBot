<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden" v-model="tabIndex").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
          li.nav-item
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-cmdboard')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-item(@click="state.editation = $state.progress")
                | Edit actions
              template(v-if="!popout")
                b-dropdown-item(target="_blank" href="/popout/#cmdboard")
                  | Popout
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'cmdboard'))").text-danger
                    | Remove <strong>{{translate('widget-title-cmdboard')}}</strong> widget
        b-tab
          template(v-slot:title)
            fa(icon='terminal' fixed-width)
          b-card-text
            loading(v-if="state.loading === $state.progress")
            template(v-else)
              div(v-if="state.editation === $state.progress").text-right
                b-button(variant="danger" @click="remove" :disabled="selected.length === 0")
                  fa(icon="trash-alt")
                b-button(variant="primary" @click="save")
                  | Done
              div.list-group
                b-row.px-2
                  b-col(v-for="item of orderBy(items, 'order')" :key="item.id" cols="6").p-1
                    button(
                      style="text-overflow: ellipsis;"
                      @dragenter="dragenter(item.order, $event)"
                      @click="state.editation === $state.idle ? emit(item) : toggle(item)"
                      :class="{'list-group-item-danger': state.editation === $state.progress && selected.includes(item.id) }"
                      :ref='"item_" + item.order'
                      :data-name="item.text"
                      :title="item.command"
                    ).list-group-item.list-group-item-action.block.px-2
                      span(style="word-break: break-all;line-height: 15px;")
                        span(
                          v-if="state.editation === $state.progress"
                          style="cursor: grab;"
                          @dragstart="dragstart(item.order, $event)"
                          @dragend="dragend(item.order, $event)"
                          draggable="true"
                        ).text-secondary
                          fa(icon="grip-vertical" fixed-width)
                        | {{item.text}}

        b-tab
          template(v-slot:title)
            fa(icon="cog" fixed-width)
          b-card-text
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('name')}}
              input(type="text" class="form-control" v-model="name")
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('command')}}
              input(type="text" class="form-control" v-model="command")
            button(type="button" @click="add" :disabled="!isConfirmEnabled").btn.btn-success.btn-block.btn-cmdboard
              | {{translate('confirm')}}
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { EventBus } from 'src/panel/helpers/event-bus';
import { orderBy } from 'lodash-es';

export default {
  props: ['popout', 'nodrag'],
  components: {
    loading: () => import('src/panel/components/loading.vue'),
  },
  data: function () {
    return {
      EventBus,
      orderBy,
      tabIndex: 0,
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
  created: function () {
      this.socket.emit('generic::getAll', (err, items) => {
        if (err) {
          return console.error(err);
        }
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
      if(this.selected.find(o => o === item.id)) {
        this.selected = this.selected.filter(o => o !== item.id);
      } else {
        this.selected.push(item.id);
      }
    },
    reorder() {
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].order = i;
      }
    },
    remove() {
      this.socket.emit('cmdboard::remove', this.items.filter(o => this.selected.includes(String(o.id))), () => {});
      this.items = this.items.filter(o => !this.selected.includes(String(o.id)))
      this.selected = [];
      this.reorder();
    },
    save() {
      this.state.editation = this.$state.idle;
      console.debug('saving', { items: Array(...this.items) })
      this.socket.emit('cmdboard::save', this.items, (err) => {
        if (err) {
          return console.error(err);
        }
      })
    },
    emit: function (item) {
      this.socket.emit('cmdboard::run', item)
    },
    add: function () {
      this.tabIndex = 0;
      this.socket.emit('cmdboard::save', [{
          text: this.name,
          command: this.command,
          order: this.items.length,
        }], (err, items) => {
        if (err) {
          return console.error(err);
        }
        this.items = [...this.items, ...items]
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
