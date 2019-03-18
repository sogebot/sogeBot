<template>
<div>
  <div class="btn-group" role="group" style="padding-left: 11px;">
    <button
      v-for="board of dashboards"
      v-bind:key="board.createdAt"
      class="btn btn-sm"
      :class="[currentDashboard === String(board._id) ? 'btn-primary' : 'btn-outline-primary border-0']"
      @click="currentDashboard = String(board._id)">{{board.name}}</button>
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
        :class="[ 'grid-stack-for-board-' + String(board._id) ]"
        v-if="show"
        v-show="currentDashboard === String(board._id)">
        <template v-for="item in items">
          <div :key="item.id"
            v-if="item.dashboardId === String(board._id)"
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
    <widget-create v-bind:dashboardId="currentDashboard" v-bind:socket="socket" v-bind:commons="commons" class="pt-4" @addWidget="addWidget"></widget-create>
    <dashboard-remove v-show="currentDashboard !== String(0)" v-bind:dashboardId="currentDashboard" v-bind:socket="socket" v-bind:commons="commons" class="pt-4" @update="currentDashboard = 0" @removeDashboard="removeDashboard"></dashboard-remove>
  </div>
</div>
</template>

<script>
export default {
  props: ['items', 'commons', 'socket', 'token', 'dashboards'],
  components: {
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
    spotify: () => import('./components/spotify.vue'),
    twitch: () => import('./components/twitch.vue'),
    twitter: () => import('./components/twitter.vue'),
    widgetCreate: () => import('./components/widget_create.vue'),
    dashboardRemove: () => import('./components/dashboard_remove.vue'),
    ytplayer: () => import('./components/ytplayer.vue'),
    social: () => import('./components/social.vue'),
  },
  data: function () {
    return {
      dashboardName: '',
      addDashboard: false,
      currentDashboard: '0',
      show: true,
      isLoaded: false,
      loaded: 0
    }
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
      this.dashboards = this.dashboards.filter(o => String(o._id) !== dashboardId)
      this.currentDashboard = 0
    },
    addWidget: function (event) {
      event.dashboardId = String(event.dashboardId)
      const grid = $('.grid-stack-for-board-' + event.dashboardId).data('gridstack')
      if (grid) grid.destroy(true)

      const dashboard = _.cloneDeep(this.dashboards.find(o => String(o._id) === event.dashboardId))
      this.dashboards = this.dashboards.filter(o => String(o._id) !== event.dashboardId)
      this.$nextTick(() => {
        this.dashboards.push(dashboard)
        this.dashboards = _.orderBy(this.dashboards, 'createdAt', 'asc')
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
          for (let changed of _.difference(_.map(this.items, o => o.id), _.map(widgets, o => o.id))) {
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