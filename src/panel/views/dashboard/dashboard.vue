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
    {{ layout }}
    <!-- mobile show -->
    <div v-if="windowWidth <= 750">
      <div v-for="item in layout" class="pl-2 pr-2 pb-2" :key="item.id">
        <keep-alive>
          <component :is="item.id" :popout="false"></component>
        </keep-alive>
      </div>
    </div>
    <div v-else>
      <grid-layout
          v-for="dashboard of dashboards"
          v-show="dashboard.id === currentDashboard"
          :key="dashboard.id"
          :layout="layout[dashboard.id] || []"
          @layout-updated="updateLayout"
          :col-num="12"
          :row-height="38"
          :is-draggable="true"
          :is-resizable="true"
          :is-mirrored="false"
          :vertical-compact="false"
          :margin="[10, 10]"
          :use-css-transforms="true"
      >
        <grid-item v-for="item in layout[dashboard.id]"
                    drag-allow-from=".grip"
                    :x="item.x"
                    :y="item.y"
                    :w="item.w"
                    :h="item.h"
                    :i="item.i"
                    :key="item.id">
          <keep-alive>
            <component :is="item.id" :popout="false" :context="$refs['widgets-menu']"></component>
          </keep-alive>
        </grid-item>
      </grid-layout>
    </div>

    <template v-if="currentDashboard === null">
      <div class="w-100"></div>
      <widget-create v-bind:dashboardId="currentDashboard" class="pt-4" @addWidget="addWidget"></widget-create>
    </template>
    <dashboard-remove v-if="currentDashboard !== null" v-bind:dashboardId="currentDashboard" class="pt-4" @update="currentDashboard = 0" @removeDashboard="removeDashboard"></dashboard-remove>
  </div>
</div>
</template>

<script>
import { EventBus } from 'src/panel/helpers/event-bus';
import { getSocket } from 'src/panel/helpers/socket';
import { cloneDeep, orderBy } from 'lodash-es';

import VueGridLayout from 'vue-grid-layout';
import { vueWindowSizeMixin } from 'vue-window-size';

export default {
  mixins: [ vueWindowSizeMixin ],
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
    GridLayout: VueGridLayout.GridLayout,
    GridItem: VueGridLayout.GridItem,
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
      layout: {'null': []},
      socket: getSocket('/')
    }
  },
  created() {
    this.isLoaded = false;
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
      this.refreshWidgets();
      this.isLoaded = true;
    });

    EventBus.$on('remove-widget', (id) => {
      this.removeWidget(id);
    });
  },
  methods: {
    refreshWidgets() {
      const layout = {'null': []};
      for (const dashboard of this.dashboards) {
        if (typeof layout[dashboard.id] === 'undefined') {
          layout[dashboard.id] = []
        }
      }
      this.layout = layout;

      let i = 0;
      for(const widget of this.items) {
        this.layout[widget.dashboardId].push({
          i, x: Number(widget.position.x), y: Number(widget.position.y), w: Number(widget.size.width), h: Number(widget.size.height), id: widget.id
        });
        i++;
      }
    },
    removeWidget(id) {
      this.items = this.items.filter(o => o.id !== id);
      this.layout = {};
      let i = 0;
      for(const widget of this.items) {
        if (typeof this.layout[widget.dashboardId] === 'undefined') {
          this.layout[widget.dashboardId] = []
        }
        this.layout[widget.dashboardId].push({
          i, x: Number(widget.position.x), y: Number(widget.position.y), w: Number(widget.size.width), h: Number(widget.size.height), id: widget.id
        });
        i++;
      }
      this.socket.emit('updateWidgets', this.items)
    },
    updateLayout(layout) {
        // remove current dashboard widgets
        this.items = [
          ...this.items.filter(o => o.dashboardId !== this.currentDashboard),
          ...layout.map(o => {
            return {
              position: { x: o.x, y: o.y },
              size: { width: o.w, height: o.h },
              dashboardId: this.currentDashboard,
              id: o.id,
            }
          }
        )]
        this.socket.emit('updateWidgets', this.items)
    },
    removeDashboard: function (dashboardId) {
      this.dashboards = this.dashboards.filter(o => String(o.id) !== dashboardId)
      this.currentDashboard = null
      this.refreshWidgets();
    },
    addWidget: function (event) {
      event.dashboardId = String(event.dashboardId)
      const dashboard = cloneDeep(this.dashboards.find(o => String(o.id) === event.dashboardId))
      this.dashboards = this.dashboards.filter(o => String(o.id) !== event.dashboardId)
      this.$nextTick(() => {
        this.dashboards.push(dashboard)
        this.dashboards = orderBy(this.dashboards, 'createdAt', 'asc')
        this.items.push(event.widget)
        this.refreshWidgets();
      })
    },
    createDashboard: function () {
      this.socket.emit('createDashboard', this.dashboardName, (created) => {
        this.dashboards.push(created)
      })
      this.dashboardName = ''
      this.addDashboard = false
      this.refreshWidgets();
    },
  }
}
</script>