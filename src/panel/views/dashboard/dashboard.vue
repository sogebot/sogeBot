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

import { defineComponent, ref, onMounted } from '@vue/composition-api'

const socket = getSocket('/');

export default defineComponent({
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
  setup(props, ctx) {
    const dashboards = ref([]);
    const dashboardName = ref('');
    const addDashboard =  ref(false);
    const currentDashboard =  ref('');
    const mainDashboard =  ref('');
    const show =  ref(true);
    const isLoaded =  ref(false);
    const layout =  ref({'null': []});
    const isLayoutInitialized =  ref(false);

    const refreshWidgets = () => {
      const _layout = {};
      for (const dashboard of dashboards.value) {
        if (typeof _layout[dashboard.id] === 'undefined') {
          _layout[dashboard.id] = [];
        }
        let i = 0;
        for(const widget of dashboard.widgets) {
          _layout[dashboard.id].push({
            i, x: Number(widget.positionX), y: Number(widget.positionY), w: Number(widget.width), h: Number(widget.height), name: widget.name, id: widget.id,
          });
          i++;
        }
      }
      layout.value = _layout;
      window.setTimeout(() => {
        isLayoutInitialized.value = true;
      }, 1000);
    };
    const removeWidget = (name) => {
      for (const dashboard of dashboards.value) {
        dashboard.widgets = dashboard.widgets.filter(o => o.name !== name);
      }
      socket.emit('panel::dashboards::save', dashboards.value)
      refreshWidgets();
    };
    const updateLayout = () => {
      if (isLayoutInitialized.value) {
        console.debug('Layout is initialized, we are executing updateLayout()');
        for (const dashboard of dashboards.value) {
          dashboard.widgets = layout.value[dashboard.id].map(o => {
            return {
              id: o.id,
              positionX: o.x,
              positionY: o.y,
              width: o.w,
              height: o.h,
              name: o.name,
              dashboardId: dashboard.id,
            };
          });
        };
        socket.emit('panel::dashboards::save', dashboards.value)
      } else {
        console.debug('Layout is not initialized yet, we are skipping updateLayout()');
      }
    };
    const removeDashboard = (dashboardId) => {
      dashboards.value = dashboards.value.filter(o => String(o.id) !== dashboardId)
      currentDashboard.value = dashboards.value[0].id
      socket.emit('panel::dashboards::save', dashboards.value)
      refreshWidgets();
    };
    const addWidget = () => {
      socket.emit('panel::dashboards', { userId: Number(ctx.root.$store.state.loggedUser.id), type: 'admin' }, (err, dashboards2) => {
        if (err) {
          return console.error(err);
        }
        dashboards.value = dashboards2;
        refreshWidgets();
        isLoaded.value = true;
      });
    };
    const createDashboard = () => {
      socket.emit('panel::dashboards::create', { userId: Number(ctx.root.$store.state.loggedUser.id), name: dashboardName.value }, (err, created) => {
        if (err) {
          return console.error(err);
        }
        dashboards.value.push(created)
      })
      dashboardName.value = ''
      addDashboard.value = false
      refreshWidgets();
    }

    onMounted(async () => {
      isLoaded.value = await Promise.race([
        new Promise(resolve => {
          socket.emit('panel::dashboards', { userId: Number(ctx.root.$store.state.loggedUser.id), type: 'admin' }, (err, dashboardsFromSocket) => {
            console.groupCollapsed('dashboard::panel::dashboards');
            console.log({err, dashboards: dashboardsFromSocket});
            console.groupEnd();
            if (err) {
              return console.error(err);
            }
            mainDashboard.value = dashboardsFromSocket[0].id
            currentDashboard.value = dashboardsFromSocket[0].id;
            for (const item of dashboardsFromSocket) {
              dashboards.value.push(item);
            }
            refreshWidgets();
            resolve(true);
          });
        }),
        new Promise(resolve => {
          setTimeout(() => resolve(false), 4000);
        }),
      ]);
      if (!isLoaded.value) {
        console.error('panel::dashboards not loaded, refreshing page')
        location.reload();
      }

      EventBus.$on('remove-widget', (id) => {
        removeWidget(id);
      });
    })

    return {
      sortBy,
      dashboards,
      dashboardName,
      addDashboard,
      currentDashboard,
      mainDashboard,
      show,
      isLoaded,
      layout,
      isLayoutInitialized,
      refreshWidgets,
      removeWidget,
      updateLayout,
      removeDashboard,
      addWidget,
      createDashboard,
    }
  }
})
</script>