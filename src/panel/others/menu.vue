<template>
  <perfect-scrollbar class="main-menu" :options="{useBothWheelAxes: true, suppressScrollY: true}">
    <nav class="nav d-flex justify-content-between" style="width: max-content">
      <span v-for="category of categories" :key="category">
        <a href="#" class="nav-link dropdown-toggle text-dark p-1" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
          {{ translate('menu.' + category) }}
          <span class="caret"></span>
        </a>
        <ul class="main-dropdown-menu dropdown-menu dropdown-detach">
          <li v-for="item of menu.filter(o => o.category === category)" :key="item.id + item.name + item.category" class="nav-item">
            <a class="nav-link text-dark" :href="'#/' + item.id.replace(/\./g, '/')" :data-page="item.id.replace(/\./g, '/')">{{translate('menu.' + item.name)}}</a>
          </li>
        </ul>
      </span>
    </nav>
  </perfect-scrollbar>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { PerfectScrollbar } from 'vue2-perfect-scrollbar'
import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css'
import { getSocket } from '../helpers/socket';

@Component({
  components: {
    PerfectScrollbar
  }
})
export default class Menu extends Vue {
  socket = getSocket('/');
  menu: any = [];
  categories = ['manage', 'settings', 'registry', 'logs', 'stats'];

  mounted() {
    // Workaround for touch screens - https://github.com/mdbootstrap/perfect-scrollbar/issues/867
    if (typeof window['DocumentTouch'] === 'undefined') {
      window['DocumentTouch'] = HTMLDocument
    }

    this.socket.emit('menu', (menu) => {
      this.menu = menu.sort((a, b) => {
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