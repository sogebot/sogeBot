<template>
<div>
  <div class="btn-group" role="group" style="padding-left: 11px;">
    <button
      v-for="board of dashboards"
      v-bind:key="board.createdAt"
      class="btn btn-sm"
      :class="[currentDashboard === board.id ? 'btn-primary' : 'btn-outline-primary border-0']"
      @click="currentDashboard = board.id">{{board.name}}</button>
    <button type="button" class="btn btn-sm btn-outline-primary border-0" v-if="!addDashboard" @click="addDashboard = true">
      <fa icon='plus-square'></fa>
    </button>
    <div class="input-group input-group-sm" v-if="addDashboard" >
      <div class="input-group-prepend">
        <button class="btn btn-outline-danger border-0" type="button" @click="dashboardName = ''; addDashboard = false">
          <fa icon='ban'></fa>
        </button>
      </div>
      <input type="text" class="form-control" placeholder="" aria-label="" v-model="dashboardName">
      <div class="input-group-append">
        <button class="btn btn-outline-success border-0" type="button" @click="createDashboard()">
          <fa icon='plus-square'></fa>
        </button>
      </div>
    </div>
  </div>

  <div class="widgets pt-1">
    <div
      v-for="board of dashboards"
      v-bind:key="board.createdAt">
      <div class="grid-stack"
        :class="[ 'grid-stack-for-board-' + board.id ]"
        v-if="show"
        v-show="currentDashboard === board.id">
        <template v-for="item in items">
          <div :key="item.id"
            v-if="item.dashboardId === board.id"
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
                <component :is="item.id" :socket="socket" @mounted="loaded = loaded + 1" :popout="false"></component>
              </keep-alive>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="w-100"></div>
    <widget-create v-bind:dashboardId="currentDashboard" class="pt-4" @addWidget="addWidget"></widget-create>
    <dashboard-remove v-show="currentDashboard !== String(0)" v-bind:dashboardId="currentDashboard" v-bind:socket="socket" class="pt-4" @update="currentDashboard = 0" @removeDashboard="removeDashboard"></dashboard-remove>
  </div>
</div>
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { cloneDeep, difference, orderBy, map } from 'lodash-es';
export default {
  components: {
    bets: () => import('src/panel/widgets/components/bets.vue'),
    chat: () => import('src/panel/widgets/components/chat.vue'),
    cmdboard: () => import('src/panel/widgets/components/cmdboard.vue'),
    commercial: () => import('src/panel/widgets/components/commercial.vue'),
    customvariables: () => import('src/panel/widgets/components/customvariables.vue'),
    eventlist: () => import('src/panel/widgets/components/eventlist.vue'),
    join: () => import('src/panel/widgets/components/join.vue'),
    part: () => import('src/panel/widgets/components/part.vue'),
    queue: () => import('src/panel/widgets/components/queue.vue'),
    raffles: () => import('src/panel/widgets/components/raffles.vue'),
    soundboard: () => import('src/panel/widgets/components/soundboard.vue'),
    spotify: () => import('src/panel/widgets/components/spotify.vue'),
    twitch: () => import('src/panel/widgets/components/twitch.vue'),
    twitter: () => import('src/panel/widgets/components/twitter.vue'),
    widgetCreate: () => import('src/panel/widgets/components/widget_create.vue'),
    dashboardRemove: () => import('src/panel/widgets/components/dashboard_remove.vue'),
    ytplayer: () => import('src/panel/widgets/components/ytplayer.vue'),
    social: () => import('src/panel/widgets/components/social.vue'),
  },
  data: function () {
    return {
      items: [],
      dashboards: [],

      dashboardName: '',
      addDashboard: false,
      currentDashboard: null,
      show: true,
      isLoaded: false,
      loaded: 0,
      socket: getSocket('/')
    }
  },
  created() {
    this.socket.emit('getWidgets', (items, dashboards) => {
      this.items = orderBy(items, 'id', 'asc');
      for (const item of this.items) {
        if (typeof item.dashboardId === 'undefined') {
          item.dashboardId = null;
        }
      }
      dashboards.push({
        createdAt: 0,
        name: 'Main',
        id: null,
      });
      this.dashboards = orderBy(dashboards, 'createdAt', 'asc');
    });
  },
  watch: {
    loaded: function (value) {
      if (value === this.items.length && !this.isLoaded) {
        this.isLoaded = true
        this.initGridStack()
      }
    }
  },
  methods: {
    removeDashboard: function (dashboardId) {
      const grid = $('.grid-stack-for-board-' + dashboardId).data('gridstack')
      if (grid) grid.destroy(true)
      this.dashboards = this.dashboards.filter(o => String(o.id) !== dashboardId)
      this.currentDashboard = null
    },
    addWidget: function (event) {
      event.dashboardId = String(event.dashboardId)
      const grid = $('.grid-stack-for-board-' + event.dashboardId).data('gridstack')
      if (grid) grid.destroy(true)

      const dashboard = cloneDeep(this.dashboards.find(o => String(o.id) === event.dashboardId))
      this.dashboards = this.dashboards.filter(o => String(o.id) !== event.dashboardId)
      this.$nextTick(() => {
        this.dashboards.push(dashboard)
        this.dashboards = orderBy(this.dashboards, 'createdAt', 'asc')
        this.items.push(event.widget)
        this.$nextTick(() => {
          const options = { cellHeight: 42, verticalMargin: 10, removable: true, removeTimeout: 100, handleClass: 'card-header' }
          $('.grid-stack-for-board-' + event.dashboardId).gridstack(options)

          this.$nextTick(() => {
            this.setGridstack()
          })
        })
      })
    },
    createDashboard: function () {
      this.socket.emit('createDashboard', this.dashboardName, (created) => {
        this.dashboards.push(created)
        this.$nextTick(() => {
          this.initGridStack()
        })
      })
      this.dashboardName = ''
      this.addDashboard = false
    },
    initGridStack: function () {
      const options = { cellHeight: 42, verticalMargin: 10, removable: true, removeTimeout: 100, handleClass: 'card-header' }
      if ($('.grid-stack').length !== this.dashboards.length) return setTimeout(() => this.initGridStack(), 1000)
      this.$nextTick(function () {
        if ($('.grid-stack').length === 0) return
        for (let grid of $('.grid-stack')) {
          $(grid).gridstack(options)
        }
        this.setGridstack()
      })
    },
    setGridstack() {
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

            // update all positions
            const widget = this.items.find(o => o.id === $(item).attr('id').split('-')[1])
            widget.position.x = $(item).attr('data-gs-x')
            widget.position.y = $(item).attr('data-gs-y')
            widget.size.height = $(item).attr('data-gs-height')
            widget.size.width = $(item).attr('data-gs-width')
          }
          for (let changed of difference(map(this.items, o => o.id), map(widgets, o => o.id))) {
            if (this.items.find(o => o.id === changed)) {
              // remove
              this.items = this.items.filter(o => o.id !== changed)
            } else {
              // insert
              this.items.push(widgets.find(o => o.id === changed))
            }
          }
          this.socket.emit('updateWidgets', widgets)
        })
    }
  }
}
</script>