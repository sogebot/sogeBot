<template>
  <div v-if="isSystemEnabled">
    <div
      class="btn btn-sm"
      style="overflow: hidden;max-height: 30px;"
      @click="toggleDisplay()"
      v-bind:class="[completed === items.length ? btnClass + 'success' : btnClass + 'danger']">
      {{completed}}/{{items.length}}
      <span><fa icon="tasks"/></span>
    </div>
    <div v-bind:class="[bDisplay ? 'd-block' : 'd-none']" style="position: absolute; width:200px; right: 1rem; z-index:9999999">
      <div class="list-group">
        <button :key="index" v-for="(item, index) of items" type="button" style="padding: 0.25rem 1.25rem" class="list-group-item list-group-item-action" @click="toggle(item)">
          <span class="pr-1" :class="[isItemCompleted(item)? 'text-success' : 'text-danger']">
            <fa v-if="isItemCompleted(item)" :icon="['far', 'check-square']"></fa>
            <fa v-else :icon="['far', 'square']"></fa>
          </span>
          {{ item }}
        </button>
      </div>
      <div class="list-group list-group-item-info text-info p-2">Add new items in <a href="#/settings/systems/checklist">checklist settings</a></div>
    </div>
  </div>
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';
library.add(faCheckSquare, faSquare);

export default {
  data: function () {
    return {
      bDisplay: false,
      total: 0,
      items: [],
      checkedItems: [],
      socket: getSocket('/systems/checklist'),
    }
  },
  computed: {
    btnClass: function () {
      if (this.bDisplay) return 'btn-'
      else return 'btn-outline-'
    },
    isSystemEnabled: function () {
      return this.$systems.find(o => o.name === 'checklist').enabled
    },
    completed: function () {
      return this.checkedItems.filter(o => o.isCompleted).length
    }
  },
  methods: {
    toggle: function (item) {
      let checkedItem = this.checkedItems.find(o => o.value === item);
      if (!checkedItem) {
        checkedItem = {};
        checkedItem.isCompleted = true;
        checkedItem.value = item;
        this.checkedItems.push(checkedItem);
      } else {
        checkedItem.isCompleted = !checkedItem.isCompleted;
      }
      this.socket.emit('checklist::save', checkedItem, () => {});
    },
    toggleDisplay: function () {
      this.bDisplay = !this.bDisplay
    },
    update: function () {
      this.socket.emit('generic::getAll', (err, items, checkedItems) => {
        if (err) {
          return console.error(err);
        }
        this.checkedItems = checkedItems;
        this.items = items;
      })
    },
    isItemCompleted(item) {
      const checkedItem = this.checkedItems.find(o => o.value === item);
      if (!checkedItem) {
        return false;
      } else {
        return checkedItem.isCompleted;
      }
    }
  },
  mounted: function () {
    if (this.isSystemEnabled) {
      this.update()
    }
  }
}
</script>