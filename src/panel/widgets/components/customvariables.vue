<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden" v-model="tabIndex").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
          li.nav-item
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-customvariables')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-item(@click="state.editation = $state.progress")
                | Edit variables
              template(v-if="!popout")
                b-dropdown-item(target="_blank" href="/popout/#customvariables")
                  | {{ translate('popout') }}
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'customvariables'))" class="text-danger"
                    v-html="translate('remove-widget').replace('$name', translate('widget-title-customvariables'))")
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
              div(v-for="(variable, index) of watchedVariables" :key="index" @dragenter="dragenter(variable.order, $event)")
                div(
                  v-bind:class="{ 'pt-1': index != 0 }"
                  :ref='"item_" + variable.order'
                ).input-group
                  div.input-group-prepend(
                    :class="{'w-100': state.editation === $state.progress}"
                  )
                    span(
                      v-if="state.editation === $state.progress"
                      style="cursor: grab;"
                      @dragstart="dragstart(variable.order, $event)"
                      @dragend="dragend(variable.order, $event)"
                      draggable="true"
                    ).text-secondary.input-group-text
                      fa(icon="grip-vertical" fixed-width)
                    span.input-group-text(
                      @click="state.editation === $state.idle ? undefined : toggle(variable)"
                      :class="{ 'w-100': state.editation === $state.progress, 'bg-dark': state.editation === $state.progress && selected.includes(variable.id), 'text-light': state.editation === $state.progress && selected.includes(variable.id) }"
                    )
                      | {{ variable.variableName }}
                  template(v-if="variable.type === 'text' && state.editation !== $state.progress")
                    number-or-text(
                      v-bind:id="variable.id"
                      v-bind:value="variable.currentValue"
                      type="text"
                      v-on:update="onUpdate"
                    )
                  template(v-else-if="variable.type ==='eval' && state.editation !== $state.progress")
                    input(type="text" readonly v-bind:value="variable.currentValue").form-control
                    span.input-group-text.border-left-0
                      fa(icon="code")
                  template(v-else-if="variable.type ==='number' && state.editation !== $state.progress")
                    number-or-text(
                      v-bind:id="variable.id"
                      v-bind:value="variable.currentValue"
                      type="number"
                      v-on:update="onUpdate"
                    )
                  template(v-else-if="variable.type ==='options' && state.editation !== $state.progress")
                    select(v-model="variable.currentValue" v-on:change="onUpdate(variable.id, variable.currentValue)").form-control
                      option(
                        v-for="option of variable.usableOptions.map((o) => o.trim())"
                       v-bind:key="option"
                        v-bind:value="String(option)"
                      )
                        | {{ option }}
        b-tab
          template(v-slot:title)
            fa(icon="cog" fixed-width)
          b-card-text
            span(v-if="nonWatchedVariablesCount > 0")
              select(v-model="selectedVariable").form-control
                option(v-bind:value="variable.id" :key="variable.id" v-for="variable of nonWatchedVariables")
                  | {{ variable.variableName }}
              button(@click="addToWatch(selectedVariable)").btn.btn-block.btn-primary
                | {{ translate('widgets.customvariables.add-variable-into-watchlist') }}
            span(v-else)
              div(v-html="translate('widgets.customvariables.no-custom-variable-found')").alert.alert-warning
</template>

<script>
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  isNil, orderBy, size,
} from 'lodash-es';

import { EventBus } from 'src/panel/helpers/event-bus';

const numberOrTextComponent = {
  props: ['id', 'value', 'type'],
  watch: {
    value: function (val) {
      this.currentValue = this.value;
    },
    currentValue: function (val, old) {
      this.showSaveButton = this.initialValue != this.currentValue;
    },
  },
  methods: {
    update: function (val) {
      if (val) {
        this.currentValue = Number(this.currentValue) + Number(val);
      } else if (this.type === 'number') {
        this.currentValue = Number(this.currentValue);
      }
      if (Number.isNaN(this.currentValue)) {
        this.currentValue = 0;
      }

      this.initialValue = this.currentValue;
      this.showSaveButton = false;

      this.$emit('update', this.id, this.currentValue);
    },
    onKeyUp: function (event) {
      if (event.key === 'Enter') {
        this.update();
      }
    },
  },
  data: function () {
    return {
      showSaveButton: false,
      currentValue:   this.value,
    };
  },
  created: function () {
    this.initialValue = this.value;
  },
  template: `
    <div class="form-control p-0 d-flex border-0">
      <input type="text" class="form-control" v-model="currentValue" style="z-index:99" v-on:keyup="onKeyUp">
      <div class="input-group-append">
        <button class="btn btn-primary" v-bind:class="{'d-none' : type !== 'number'}" type="button" v-on:click="update(1)"><fa icon="plus" /></button>
        <button class="btn btn-danger" v-bind:class="{'d-none' : type !== 'number'}" type="button" v-on:click="update(-1)"><fa icon="minus" /></button>
        <button class="btn btn-secondary" v-bind:class="{'d-none' : !showSaveButton}" type="button" v-on:click="update()"><fa icon="download" /></button>
        <span class="input-group-text">
          <strong v-if="this.type === 'number'">0-9</strong>
          <fa icon="font" v-else />
        </span>
      </div>
    </div>
    `,
};
export default {
  components: {
    'number-or-text': numberOrTextComponent,
    loading:          () => import('src/panel/components/loading.vue'),
  },
  props: ['popout', 'nodrag'],
  data:  function () {
    return {
      translate,
      EventBus,
      variables: [],
      watched:   [],
      tabIndex:  0,
      state:     {
        editation: this.$state.idle,
        loading:   this.$state.progress,
      },
      selected:         [],
      selectedVariable: null,
      socket:           getSocket('/widgets/customvariables'),
      draggingItem:     null,
    };
  },
  computed: {
    watchedVariables: function () {
      const watched = [];
      for (const variable of this.variables) {
        const filtered = this.watched.filter((o) => o.variableId === variable.id);
        if (filtered.length !== 0) {
          variable.order = filtered[0].order;
          watched.push(variable);
        }
      }
      return orderBy(watched, 'order', 'asc');
    },
    nonWatchedVariables: function () {
      const nonWatched = [];
      for (const variable of this.variables) {
        const filtered = this.watched.filter((o) => o.variableId === variable.id);
        if (filtered.length === 0) {
          nonWatched.push(variable);
        }
      }
      return nonWatched;
    },
    nonWatchedVariablesCount: function () {
      return size(this.nonWatchedVariables);
    },
  },
  watch: {
    nonWatchedVariables: function (value) {
      if (!isNil(this.nonWatchedVariables[0])) {
        this.selectedVariable = this.nonWatchedVariables[0].id;
      }
    },
  },
  created: async function () {
    this.state.loading = this.$state.progress;
    this.socket.on('refresh', () => {
      this.refreshVariablesList();
      this.refreshWatchList();
    });
    await Promise.all([
      this.refreshVariablesList(),
      this.refreshWatchList(),
    ]);
    this.state.loading = this.$state.success;
  },
  methods: {
    onUpdate: function (id, value) {
      this.socket.emit('watched::setValue', { id, value }, (err) => {
        this.refreshVariablesList();
        this.refreshWatchList();
      });
    },
    addToWatch: function (variableId) {
      this.tabIndex = 0;
      this.watched = [
        ...this.watched,
        {
          variableId: variableId,
          order:      this.watched.length,
        },
      ],
      this.save();
    },
    reorder() {
      for (let i = 0; i < this.watched.length; i++) {
        this.watched[i].order = i;
      }
    },
    remove() {
      this.watched = this.watched.filter(o => !this.selected.includes(String(o.variableId)));
      this.selected = [];
      this.reorder();
    },
    save() {
      this.state.editation = this.$state.idle;
      this.socket.emit('watched::save', this.watched, () => {
        return;
      });
    },
    refreshVariablesList: function () {
      return new Promise((resolve) => {
        this.socket.emit('customvariables::list', (err, data) => {
          if (err) {
            return console.error(err);
          }
          console.log('Loaded', data);
          this.variables = data;
          resolve();
        });
      });
    },
    refreshWatchList: function () {
      return new Promise((resolve) => {
        this.socket.emit('list.watch', (err, data) => {
          this.watched = data;
          resolve();
        });
      });
    },
    dragstart(order, e) {
      this.draggingItem = order;
      this.$refs['item_' + order][0].style.opacity = 0.5;
      e.dataTransfer.setData('text/plain', 'dummy');
    },
    dragenter(newOrder, e) {
      const value = this.watched.find(o => o.order === this.draggingItem);
      const entered = this.watched.find(o => o.order === newOrder);
      entered.order = this.draggingItem;
      this.draggingItem = newOrder;
      value.order = this.draggingItem;

      for (let i = 0, length = this.watched.length; i < length; i++) {
        this.$refs['item_' + this.watched[i].order][0].style.opacity = 1;
      }
      this.$refs['item_' + this.draggingItem][0].style.opacity = 0.5;

      this.$forceUpdate();
    },
    dragend(order, e) {
      for (let i = 0, length = this.watched.length; i < length; i++) {
        this.$refs['item_' + this.watched[i].order][0].style.opacity = 1;
      }
    },
    toggle(item) {
      if(this.selected.find(o => o === item.id)) {
        this.selected = this.selected.filter(o => o !== item.id);
      } else {
        this.selected.push(item.id);
      }
    },
  },
};
</script>
