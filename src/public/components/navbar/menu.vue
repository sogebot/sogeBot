<template>
  <perfect-scrollbar
    class="main-menu"
    :options="{useBothWheelAxes: true, suppressScrollY: true}"
  >
    <nav
      id="menu-detach"
      class="nav d-flex justify-content-between"
      style="width: max-content"
    >
      <b-nav-item
        v-for="item of menu"
        :key="item.name"
        :href="'#/' + item.id.replace(/\./g, '/')"
      >
        {{ translate('menu.' + item.name) }}
      </b-nav-item>
    </nav>
  </perfect-scrollbar>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, ref,
} from '@vue/composition-api';
import { PerfectScrollbar } from 'vue2-perfect-scrollbar';

import type { menuPublic } from 'src/bot/helpers/panel';

import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css';

const socket = getSocket('/');

export default defineComponent({
  components: { PerfectScrollbar },
  setup() {
    const menu = ref([] as typeof menuPublic);

    onMounted(async () => {
      // Workaround for touch screens - https://github.com/mdbootstrap/perfect-scrollbar/issues/867
      if (typeof (window as any).DocumentTouch === 'undefined') {
        (window as any).DocumentTouch = HTMLDocument;
      }

      socket.emit('menu::public', (err: string | null, data: typeof menuPublic) => {
        if (err) {
          return console.error(err);
        }
        console.groupCollapsed('menu::menu::public');
        console.log({ data });
        console.groupEnd();
        for (const item of data.sort((a, b) => {
          return translate('menu.' + a.name).localeCompare(translate('menu.' + b.name));
        })) {
          menu.value.push(item);
        }
      });
    });
    return { menu, translate };
  },
});
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