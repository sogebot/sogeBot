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
        <button :key="index" v-for="(item, index) of items" type="button" style="padding: 0.25rem 1.25rem" class="list-group-item list-group-item-action" @click="items[index].completed = !items[index].completed; onChange()">
          <span class="pr-1" :class="[item.completed? 'text-success' : 'text-danger']">
            <fa v-if="item.completed" :icon="['far', 'check-square']"></fa>
            <fa v-else :icon="['far', 'square']"></fa>
          </span>
          {{ item.text }}
        </button>
      </div>
      <div class="list-group list-group-item-info text-info p-2">Add new items in <a href="#/settings/systems/checklist">checklist settings</a></div>
    </div>
  </div>
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { debounce } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';
library.add(faCheckSquare, faSquare);

export default {
  props: ['commons', 'systems'],
  data: function () {
    return {
      bDisplay: false,
      total: 0,
      items: [],
      socket: getSocket('/systems/checklist'),
    }
  },
  computed: {
    btnClass: function () {
      if (this.bDisplay) return 'btn-'
      else return 'btn-outline-'
    },
    isSystemEnabled: function () {
      return this.systems.find(o => o.name === 'checklist').enabled
    },
    completed: function () {
      return this.items.filter(o => o.completed).length
    }
  },
  methods: {
    onChange: debounce(function () {
      let items = []
      for (let item of this.items) {
        items.push({ value: item.text, completed: item.completed})
      }
      this.socket.emit('update', { key: 'value', items })
      }, 1000),
    toggleDisplay: function () {
      this.bDisplay = !this.bDisplay
    },
    update: function () {
      this.socket.emit('findOne', { collection: 'settings', where: { key: 'itemsArray' }}, (err, data) => {
        if (err) return console.error(err)
        if (typeof data.value !== 'undefined' && data.value.length > 0) {
          // load complete data
          this.socket.emit('find', {}, (err, data2) => {
            this.items = []
            for (let item of data.value) {
              const completed = (data2.find(o => o.value === item) || { completed: false }).completed
              this.items.push({ text: item, completed })
            }
          })
        }
      })
    }
  },
  mounted: function () {
    if (this.isSystemEnabled) {
      this.update()
    }
  }
}
</script>