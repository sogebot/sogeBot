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
    <!-- mobile show -->
    <div v-if="windowWidth <= 750">
      <template v-for="dashboard of dashboards">
        <div v-for="item in sortBy(layout[dashboard.id], (o) => o.y)" class="pl-2 pr-2 pb-2" :key="'widget' + item.name" v-show="dashboard.id === currentDashboard">
          <keep-alive>
            <component :is="item.name" :popout="false" nodrag :style="{ height: String(item.h * 50) + 'px'}"></component>
          </keep-alive>
        </div>
      </template>
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
                    :key="'widget2' + item.name">
          <keep-alive>
            <component :is="item.name" :popout="false"></component>
          </keep-alive>
        </grid-item>
      </grid-layout>
    </div>

    <div class="w-100"></div>
    <widget-create v-bind:dashboardId="currentDashboard" class="pt-4" @addWidget="addWidget"></widget-create>
    <dashboard-remove v-if="currentDashboard !== mainDashboard" v-bind:dashboardId="currentDashboard" class="pt-4" @update="currentDashboard = mainDashboard" @removeDashboard="removeDashboard"></dashboard-remove>
  </div>
</div>
</template>

<script>
import { EventBus } from 'src/panel/helpers/event-bus';
import { getSocket } from 'src/panel/helpers/socket';
import { sortBy } from 'lodash-es';

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
    randomizer: () => import('src/panel/widgets/components/randomizer.vue'),
    soundboard: () => import('src/panel/widgets/components/soundboard.vue'),
    spotify: () => import('src/panel/widgets/components/spotify.vue'),
    twitch: () => import('src/panel/widgets/components/twitch.vue'),
    widgetCreate: () => import('src/panel/widgets/components/widget_create.vue'),
    dashboardRemove: () => import('src/panel/widgets/components/dashboard_remove.vue'),
    ytplayer: () => import('src/panel/widgets/components/ytplayer.vue'),
    social: () => import('src/panel/widgets/components/social.vue'),
    GridLayout: VueGridLayout.GridLayout,
    GridItem: VueGridLayout.GridItem,
  },
  data: function () {
    return {
      sortBy,
      dashboards: [],

      dashboardName: '',
      addDashboard: false,
      currentDashboard: '',
      mainDashboard: '',
      show: true,
      isLoaded: false,
      layout: {'null': []},
      socket: getSocket('/')
    }
  },
  async mounted() {
    this.isLoaded = await Promise.race([
      new Promise(resolve => {
        this.socket.emit('panel::dashboards', { userId: Number(this.$loggedUser.id), type: 'admin' }, (err, dashboards) => {
          console.groupCollapsed('dashboard::panel::dashboards');
          console.log({err, dashboards});
          console.groupEnd();
          if (err) {
            return console.error(err);
          }
          this.mainDashboard = dashboards[0].id
          this.currentDashboard = dashboards[0].id;
          for (const item of dashboards) {
            this.dashboards.push(item);
          }
          this.refreshWidgets();
          resolve(true);
        });
      }),
      new Promise(resolve => {
        setTimeout(() => resolve(false), 4000);
      }),
    ]);
    if (!this.isLoaded) {
      console.error('panel::dashboards not loaded, refreshing page')
      location.reload();
    }

    EventBus.$on('remove-widget', (id) => {
      this.removeWidget(id);
    });
  },
  methods: {
    refreshWidgets() {
      const layout = {};
      for (const dashboard of this.dashboards) {
        if (typeof layout[dashboard.id] === 'undefined') {
          layout[dashboard.id] = [];
        }
        let i = 0;
        for(const widget of dashboard.widgets) {
          layout[dashboard.id].push({
            i, x: Number(widget.positionX), y: Number(widget.positionY), w: Number(widget.width), h: Number(widget.height), name: widget.name
          });
          i++;
        }
      }
      this.layout = layout;
    },
    removeWidget(name) {
      for (const dashboard of this.dashboards) {
        dashboard.widgets = dashboard.widgets.filter(o => o.name !== name);
      }
      this.socket.emit('panel::dashboards::save', this.dashboards)
      this.refreshWidgets();
    },
    updateLayout(layout) {
      for (const dashboard of this.dashboards) {
        dashboard.widgets = this.layout[dashboard.id].map(o => {
          return {
            positionX: o.x,
            positionY: o.y,
            width: o.w,
            height: o.h,
            name: o.name,
          };
        });
      };
      this.socket.emit('panel::dashboards::save', this.dashboards)
    },
    removeDashboard: function (dashboardId) {
      this.dashboards = this.dashboards.filter(o => String(o.id) !== dashboardId)
      this.currentDashboard = this.dashboards[0].id
      this.socket.emit('panel::dashboards::save', this.dashboards)
      this.refreshWidgets();
    },
    addWidget: function () {
      this.socket.emit('panel::dashboards', { userId: Number(this.$loggedUser.id), type: 'admin' }, (err, dashboards) => {
        if (err) {
          return console.error(err);
        }
        this.dashboards = dashboards;
        this.refreshWidgets();
        this.isLoaded = true;
      });
    },
    createDashboard: function () {
      this.socket.emit('panel::dashboards::create', { userId: Number(this.$loggedUser.id), name: this.dashboardName }, (err, created) => {
        if (err) {
          return console.error(err);
        }
        this.dashboards.push(created)
      })
      this.dashboardName = ''
      this.addDashboard = false
      this.refreshWidgets();
    },
  }
}
</script>