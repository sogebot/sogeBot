<template>
  <perfect-scrollbar class="main-menu" :options="{useBothWheelAxes: true, suppressScrollY: true}">
    <nav id="menu-detach" class="nav d-flex justify-content-between" style="width: max-content">
      <span v-for="category of categories" :key="category">
        <b-dropdown variant="light">
          <template v-slot:button-content>
            {{ translate('menu.' + category) }}
          </template>
          <b-dropdown-item v-for="item of menu.filter(o => o.category === category && o.enabled)"
                           :key="item.id + item.name + item.category"
                           :href="'#/' + item.id.replace(/\./g, '/')">
            {{translate('menu.' + item.name)}}
          </b-dropdown-item>
          <b-dropdown-group id="dropdown-group-1" v-if="menu.filter(o => o.category === category && !o.enabled).length > 0" class="pt-2">
            <template v-slot:header>
              <header class="p-1" @click.prevent="isDisabledHidden = !isDisabledHidden" style="cursor: pointer;">
                {{ translate('disabled') }}
                <small>
                  <fa icon="plus" fixed-width v-if="isDisabledHidden"/>
                  <fa icon="minus" fixed-width v-else />
                </small>
              </header>
            </template>
            <template v-if="!isDisabledHidden">
              <b-dropdown-item v-for="item of menu.filter(o => o.category === category && !o.enabled)"
                              :key="item.id + item.name + item.category"
                              :href="'#/' + item.id.replace(/\./g, '/')">
                {{translate('menu.' + item.name)}}
              </b-dropdown-item>
            </template>
          </b-dropdown-group>
        </b-dropdown>
      </span>
    </nav>
  </perfect-scrollbar>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { PerfectScrollbar } from 'vue2-perfect-scrollbar'
import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css'
import { getSocket } from 'src/panel/helpers/socket';

import type { menu } from 'src/bot/helpers/panel';

type menuWithEnabled = Omit<typeof menu[number], 'this'> & { enabled: boolean };

@Component({
  components: {
    PerfectScrollbar
  }
})
export default class Menu extends Vue {
  socket = getSocket('/');
  menu: menuWithEnabled[] = [];
  categories = ['manage', 'settings', 'registry', /* 'logs', */ 'stats'];
  isDisabledHidden = true;

  async mounted() {
    // Workaround for touch screens - https://github.com/mdbootstrap/perfect-scrollbar/issues/867
    if (typeof (window as any).DocumentTouch === 'undefined') {
      (window as any).DocumentTouch = HTMLDocument
    }

    const isLoaded = await Promise.race([
      new Promise(resolve => {
        this.socket.emit('menu', (err: string | null, data: menuWithEnabled[]) => {
          if (err) {
            return console.error(err);
          }
          console.groupCollapsed('menu::menu');
          console.log({data});
          console.groupEnd();
          for (const item of data.sort((a, b) => {
            return this.translate('menu.' + a.name).localeCompare(this.translate('menu.' + b.name))
          })) {
            this.menu.push(item);
          }
          resolve(true);
        });
      }),
      new Promise(resolve => {
        setTimeout(() => resolve(false), 4000);
      }),
    ]);

    if (!isLoaded) {
      console.error('menu not loaded, refreshing page')
      location.reload();
    }
  }
}
</script>
<style>
.ps__rail-x {
  height: 0;
  position: relative;
  top: 2px;
}
.ps__thumb-x {
  height: 4px;
}
.ps__rail-x:hover > .ps__thumb-x, .ps__rail-x:focus > .ps__thumb-x, .ps__rail-x.ps--clicking .ps__thumb-x {
  height: 6px;
}
</style>