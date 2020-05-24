<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden" v-model="tabIndex").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
          li.nav-item
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-randomizer')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-item(@click="state.editation = $state.progress")
                | Edit items
              template(v-if="!popout")
                b-dropdown-item(target="_blank" href="/popout/#randomizer")
                  | Popout
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'randomizer'))").text-danger
                    | Remove <strong>{{translate('widget-title-randomizer')}}</strong> widget
        b-tab
          template(v-slot:title)
            fa(icon="dollar-sign" fixed-width)
          b-card-text
            loading(v-if="state.loading === $state.progress")
            template(v-else)
              div(v-if="state.editation === $state.progress").text-right.pb-2
                b-button(variant="danger" @click="remove" :disabled="selected.length === 0")
                  fa(icon="trash-alt")
                b-button(variant="primary" @click="save")
                  | Done
              div(v-for="(variable, index) of watchedItems" :key="index" @dragenter="dragenter(variable.widgetOrder, $event)")
                div(
                  v-bind:class="{ 'pt-1': index != 0 }"
                  :ref='"randomizer_item_" + variable.widgetOrder'
                ).input-group
                  div.input-group-prepend(
                    :class="{'w-100': state.editation === $state.progress}"
                  ).w-100
                    span(
                      v-if="state.editation === $state.progress"
                      style="cursor: grab;"
                      @dragstart="dragstart(variable.widgetOrder, $event)"
                      @dragend="dragend(variable.widgetOrder, $event)"
                      draggable="true"
                    ).text-secondary.input-group-text
                      fa(icon="grip-vertical" fixed-width)
                    span.input-group-text(
                      @click="state.editation === $state.idle ? undefined : toggle(variable)"
                      :class="{ 'w-100': state.editation === $state.progress, 'bg-dark': state.editation === $state.progress && selected.includes(variable.id), 'text-light': state.editation === $state.progress && selected.includes(variable.id) }"
                    ).w-100
                      | {{ variable.name }} ... {{ variable.command }}
                    b-button(
                      :variant="variable.isShown ? 'success' : 'danger'"
                      v-if="state.editation !== $state.progress"
                      @click="toggleIsShown(variable)"
                    )
                      fa(icon="eye" fixed-width v-if="variable.isShown")
                      fa(icon="eye-slash" fixed-width v-else)
                    b-button(
                      variant="dark"
                      v-if="state.editation !== $state.progress && variable.isShown"
                      :disabled="!variable.isShown || isSpinning"
                      @click="spin"
                    )
                      fa(icon="dice" fixed-width v-if="!isSpinning || !variable.isShown")
                      fa(:icon="'dice-' + diceIcon[diceIconIdx]" fixed-width v-else)

        b-tab
          template(v-slot:title)
            fa(icon="cog" fixed-width)
          b-card-text
            span(v-if="nonWatchedItemsCount > 0")
              select(v-model="selectedVariable").form-control
                option(v-bind:value="variable.id" :key="variable.id" v-for="variable of nonWatchedItems")
                  | {{ variable.name }} ... {{ variable.command }}
              button(@click="addToWatch(selectedVariable)").btn.btn-block.btn-primary
                | {{ translate('widgets.randomizer.add-randomizer-to-widget') }}
            span(v-else)
              div(v-html="translate('widgets.randomizer.no-randomizer-found')").alert.alert-warning
</template>

<script>
import { EventBus } from 'src/panel/helpers/event-bus';
import { getSocket } from 'src/panel/helpers/socket';
import { isNil, size, orderBy } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faDice, faDiceOne, faDiceTwo, faDiceThree, faDiceFour, faDiceFive, faDiceSix } from '@fortawesome/free-solid-svg-icons';
library.add(faDice, faDiceOne, faDiceTwo, faDiceThree, faDiceFour, faDiceFive, faDiceSix);

export default {
  props: ['popout', 'nodrag'],
  components: {
    loading: () => import('src/panel/components/loading.vue'),
  },
  data: function () {
    return {
      EventBus,
      items: [],
      tabIndex: 0,
      state: {
        editation: this.$state.idle,
        loading: this.$state.progress,
      },
      selected: [],
      selectedVariable: null,
      socket: getSocket('/registries/randomizer'),
      draggingItem: null,

      isSpinning: false,
      diceIcon: ['one', 'two', 'three', 'four', 'five', 'six'],
      diceIconIdx: 0,

      interval: 0,
      }
  },
  created: async function () {
    this.state.loading = this.$state.progress;
    await Promise.all([
      this.refresh(),
    ])
    this.state.loading = this.$state.success;

    this.interval = setInterval(() => {
      if (this.isSpinning) {
        this.diceIconIdx = Math.floor(Math.random() * this.diceIcon.length);
      }
    }, 100)
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  computed: {
    watchedItems: function () {
      return orderBy(this.items.filter((o) => o.widgetOrder !== -1), 'widgetOrder', 'asc')
    },
    nonWatchedItems: function () {
      return [
        ...this.items.filter((o) => o.widgetOrder === -1)
      ]
    },
    nonWatchedItemsCount: function () {
      return size(this.nonWatchedItems)
    }
  },
  watch: {
    nonWatchedItems: function (value) {
      if (!isNil(this.nonWatchedItems[0])) {
        this.selectedVariable = this.nonWatchedItems[0].id
      }
    }
  },
  methods: {
    spin: function () {
      this.isSpinning = true;
      this.socket.emit('randomizer::startSpin', () => {})
      setTimeout(() => {
        this.isSpinning = false;
      }, 10000)
    },
    toggleIsShown: function (variable) {
      const isShown = variable.isShown;
      for (const item of this.items) {
        item.isShown = false;
      }
      variable.isShown = !isShown;
      this.save();
    },
    addToWatch: function (variable) {
      this.items.find(o => o.id === variable).widgetOrder = this.watchedItems.length
      this.save();
    },
    reorder() {
      for (let i = 0; i < this.watchedItems.length; i++) {
        this.items.find(o => o.id === this.watchedItems[i].id).widgetOrder = i;
      }
    },
    remove() {
      for (const items of this.items.filter(o => this.selected.includes(o.id))) {
        items.widgetOrder = -1;
      }
      this.selected = [];
      this.reorder();
    },
    save() {
      this.state.editation = this.$state.idle;
      this.socket.emit('randomizer::save', this.items, () => {})
    },
    refresh: function () {
      return new Promise((resolve) => {
        this.socket.emit('generic::getAll', (err, data) => {
          if (err) {
            return console.error(err);
          }
          console.log('Loaded', data);
          this.items = data
          resolve()
        })
      })
    },
    dragstart(order, e) {
      this.draggingItem = order;
      this.$refs['randomizer_item_' + order][0].style.opacity = 0.5;
      e.dataTransfer.setData('text/plain', 'dummy');
    },
    dragenter(newOrder, e) {
      const value = this.items.find(o => o.widgetOrder === this.draggingItem)
      const entered = this.items.find(o => o.widgetOrder === newOrder)
      entered.widgetOrder = this.draggingItem;
      this.draggingItem = newOrder
      value.widgetOrder = this.draggingItem;

      for (let i = 0, length = this.watchedItems.length; i < length; i++) {
        this.$refs['randomizer_item_' + this.watchedItems[i].widgetOrder][0].style.opacity = 1;
      }
      this.$refs['randomizer_item_' + this.draggingItem][0].style.opacity = 0.5;

      this.$forceUpdate()
    },
    dragend(order, e) {
      for (let i = 0, length = this.watchedItems.length; i < length; i++) {
        this.$refs['randomizer_item_' + this.watchedItems[i].widgetOrder][0].style.opacity = 1;
      }
    },
    toggle(item) {
      if(this.selected.find(o => o === item.id)) {
        this.selected = this.selected.filter(o => o !== item.id);
      } else {
        this.selected.push(item.id);
      }
    },
  }
}
</script>
