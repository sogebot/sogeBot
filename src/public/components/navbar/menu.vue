<template>
  <perfect-scrollbar class="main-menu" :options="{useBothWheelAxes: true, suppressScrollY: true}">
    <nav id="menu-detach" class="nav d-flex justify-content-between" style="width: max-content">
      <b-nav-item :key="item.name" v-for="item of menu" :href="'#/' + item.id.replace(/\./g, '/')">
        {{translate('menu.' + item.name)}}
      </b-nav-item>
    </nav>
  </perfect-scrollbar>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { PerfectScrollbar } from 'vue2-perfect-scrollbar'
import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css'
import { getSocket } from 'src/panel/helpers/socket';

@Component({
  components: {
    PerfectScrollbar
  }
})
export default class Menu extends Vue {
  socket = getSocket('/', true);
  menu: any = [];

  mounted() {
    // Workaround for touch screens - https://github.com/mdbootstrap/perfect-scrollbar/issues/867
    if (typeof window['DocumentTouch'] === 'undefined') {
      window['DocumentTouch'] = HTMLDocument
    }

    this.socket.emit('menu::public', (menu) => {
      this.menu = menu.sort((a, b) => {
        if (a.name === 'dashboard') {
          return -1;
        };
        if (b.name === 'dashboard') {
          return 1;
        };
        return this.translate('menu.' + a.name).localeCompare(this.translate('menu.' + b.name))
      });
    });
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