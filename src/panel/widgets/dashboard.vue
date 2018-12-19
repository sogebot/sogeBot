<template>
<div>
  <div class="btn-group" role="group" style="padding-left: 11px;">
    <button
      type="button"
      class="btn btn-sm"
      :class="[currentDashboard === 0 ? 'btn-primary' : 'btn-outline-primary border-0']"
      @click="currentDashboard = 0">Main</button>
    <button
      v-for="board of dashboards"
      v-bind:key="board.createdAt"
      class="btn btn-sm"
      :class="[currentDashboard === String(board._id) ? 'btn-primary' : 'btn-outline-primary border-0']"
      @click="currentDashboard = String(board._id)">{{board.name}}</button>
    <button type="button" class="btn btn-sm btn-outline-primary border-0" v-if="!addDashboard" @click="addDashboard = true">
      <font-awesome-icon icon='plus-square'></font-awesome-icon>
    </button>
    <div class="input-group input-group-sm" v-if="addDashboard" >
      <div class="input-group-prepend">
        <button class="btn btn-outline-danger border-0" type="button" @click="dashboardName = ''; addDashboard = false">
          <font-awesome-icon icon='ban'></font-awesome-icon>
        </button>
      </div>
      <input type="text" class="form-control" placeholder="" aria-label="" v-model="dashboardName">
      <div class="input-group-append">
        <button class="btn btn-outline-success border-0" type="button" @click="createDashboard()">
          <font-awesome-icon icon='plus-square'></font-awesome-icon>
        </button>
      </div>
    </div>
  </div>

  <div class="widgets pt-1">
    <div>
      <div class="grid-stack-for-board-0 grid-stack" v-if="show" v-show="currentDashboard === 0">
        <template v-for="item in items">
          <div :key="item.id"
            v-if="typeof item.dashboardId === 'undefined' || String(item.dashboardId) === '0'"
            v-bind:id="'widget-' + item.id"
            v-bind:data-dashboardId="item.dashboardId"
            v-bind:data-gs-x="item.position.x"
            v-bind:data-gs-y="item.position.y"
            v-bind:data-gs-width="item.size.width"
            v-bind:data-gs-height="item.size.height"
            class="grid-stack-item"
          >
            <div class="grid-stack-item-content">
              <keep-alive>
                <component :is="item.id" :token="token" :socket="socket" :commons="commons" @mounted="loaded = loaded + 1" :popout="false"></component>
              </keep-alive>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div
      v-for="board of dashboards"
      v-bind:key="board.createdAt">
      <div class="grid-stack"
        :class="[ 'grid-stack-for-board-' + String(board._id) ]"
        v-if="show"
        v-show="currentDashboard === String(board._id)">
        <template v-for="item in items">
          <div :key="item.id"
            v-if="typeof item.dashboardId !== 'undefined' && item.dashboardId === String(board._id)"
            v-bind:id="'widget-' + item.id"
            v-bind:data-dashboardId="item.dashboardId"
            v-bind:data-gs-x="item.position.x"
            v-bind:data-gs-y="item.position.y"
            v-bind:data-gs-width="item.size.width"
            v-bind:data-gs-height="item.size.height"
            class="grid-stack-item"
          >
            <div class="grid-stack-item-content">
              <keep-alive>
                <component :is="item.id" :token="token" :socket="socket" :commons="commons" @mounted="loaded = loaded + 1" :popout="false"></component>
              </keep-alive>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="w-100"></div>
    <widget-create v-bind:dashboardId="currentDashboard" v-bind:socket="socket" v-bind:commons="commons" class="pt-4"></widget-create>
    <dashboard-remove v-show="currentDashboard !== 0" v-bind:dashboardId="currentDashboard" v-bind:socket="socket" v-bind:commons="commons" class="pt-4" @update="currentDashboard = 0"></dashboard-remove>
  </div>
</div>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faBan, faPlusSquare } from '@fortawesome/free-solid-svg-icons';

library.add(faBan, faPlusSquare)

export default {
  props: ['items', 'commons', 'socket', 'token', 'dashboards'],
  components: {
    'font-awesome-icon': FontAwesomeIcon,
    bets: () => import('./components/bets.vue'),
    chat: () => import('./components/chat.vue'),
    cmdboard: () => import('./components/cmdboard.vue'),
    commercial: () => import('./components/commercial.vue'),
    customvariables: () => import('./components/customvariables.vue'),
    eventlist: () => import('./components/eventlist.vue'),
    join: () => import('./components/join.vue'),
    part: () => import('./components/part.vue'),
    queue: () => import('./components/queue.vue'),
    raffles: () => import('./components/raffles.vue'),
    soundboard: () => import('./components/soundboard.vue'),
    twitch: () => import('./components/twitch.vue'),
    twitter: () => import('./components/twitter.vue'),
    widgetCreate: () => import('./components/widget_create.vue'),
    dashboardRemove: () => import('./components/dashboard_remove.vue'),
    ytplayer: () => import('./components/ytplayer.vue')
  },
  data: function () {
    return {
      dashboardName: '',
      addDashboard: false,
      currentDashboard: 0,
      show: true,
      loaded: 0
    }
  },
  watch: {
    items: function (value, old) {
      if (value.length > old.length) {
        this.loaded = 0
        this.show = false
        this.$nextTick(function () { this.show = true })
      }
    },
    loaded: function (value) {
      if (value === this.items.length) this.initGridStack()
    }
  },
  created: function () {
    this.socket.on('dashboard', (widgets, dashboards) => {
      this.items = widgets;
      this.dashboards = dashboards;
      this.initGridStack()
    })
  },
  methods: {
    createDashboard: function () {
      this.socket.emit('createDashboard', this.dashboardName, (created) => {
        this.dashboards.push(created)
      })
      this.dashboardName = ''
      this.addDashboard = false
    },
    initGridStack: function () {
      const options = { cellHeight: 42, verticalMargin: 10, removable: true, removeTimeout: 100, handleClass: 'card-header' }
      if ($('.grid-stack').length - 1 !== this.dashboards.length) return setTimeout(() => this.initGridStack(), 1000)
      this.$nextTick(function () {
        if ($('.grid-stack').length === 0) return
        for (let grid of $('.grid-stack')) {
          $(grid).gridstack(options)
        }
        $('.grid-stack-item').draggable({cancel: "div.not-draggable" });

        $('.grid-stack').off('change').on('change', () => {
          let widgets = []
          for (let item of $('.grid-stack-item')) {
            widgets.push({
              dashboardId: $(item).attr('data-dashboardId'),
              id: $(item).attr('id').split('-')[1],
              position: {
                x: $(item).attr('data-gs-x'),
                y: $(item).attr('data-gs-y')
              },
              size: {
                height: $(item).attr('data-gs-height'),
                width: $(item).attr('data-gs-width')
              }
            })
          }
          this.socket.emit('updateWidgets', widgets)
        })
      })
    }
  }
}
</script>