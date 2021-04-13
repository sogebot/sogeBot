<template>
  <footer
    class="footer"
    @dblclick="setDebug()"
  >
    <span
      class="alert"
      :class="[className(data.API)]"
      style="padding:0;"
      :title="'API ' + title(data.API)"
    >API</span>
    <span
      class="alert"
      :class="[className(data.TMI)]"
      style="padding:0;"
      :title="'TMI ' + title(data.TMI)"
    >TMI</span>
    <span
      class="alert"
      :class="[classNameMod(data.SOC)]"
      style="padding:0;"
      :title="'SOC ' + (data.SOC ? 'connected' : 'disconnected')"
    >SOC</span>
    <span
      class="alert"
      :class="[classNameMod(data.MOD)]"
      style="padding:0;"
      :title="'Bot is ' + (data.MOD ? ' ': 'not ') + 'a MOD.'"
    >MOD</span>
    <a href="https://github.com/sogehige/SogeBot">GitHub</a> |
    <a href="https://github.com/sogehige/SogeBot/issues">Issues</a> |
    <a href="https://github.com/sogehige/SogeBot/blob/master/LICENSE">GPL-3.0 License</a> |
    <span
      class="alert"
      style="padding:0;"
    >{{ version }}</span>
  </footer>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import {
  defineComponent, onMounted, reactive, ref,
} from '@vue/composition-api';

const socket = getSocket('/');

function classNameMod(is: boolean) {
  return is ? 'alert-success' : 'alert-danger';
}

function className (status: 0 | 1 | 2 | 3) {
  switch (status) {
    case 0:
      return 'alert-danger';
    case 1:
      return 'alert-warning';
    case 2:
      return 'alert-warning';
    case 3:
      return 'alert-success';
  }
}

function title(status: 0 | 1 | 2 | 3) {
  switch (status) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connecting';
    case 2:
      return 'reconnecting';
    case 3:
      return 'connected';
  }
}

const setDebug = () => {
  socket.emit('debug::get', (err: null, debugEnv: string) => {
    const debug = prompt('Set debug', debugEnv);
    if (debug !== null) {
      socket.emit('debug::set', debug);
    }
  });
};

export default defineComponent({
  setup() {
    const version = ref('');
    const data: {
      SOC: boolean;
      MOD: boolean;
      API: 0 | 1 | 2 | 3;
      TMI: 0 | 1 | 2 | 3;
    } = reactive({
      SOC: false,
      MOD: false,
      API: 0,
      TMI: 0,
    });

    const refresh = () => {
      socket.emit('connection_status', (dataFromSocket: {
        SOC: boolean;
        MOD: boolean;
        RES: number;
        API: 0 | 1 | 2 | 3;
        TMI: 0 | 1 | 2 | 3;
      }) => {
        data.SOC = true;
        data.MOD = dataFromSocket.MOD;
        data.API = dataFromSocket.API;
        data.TMI = dataFromSocket.TMI;
        setTimeout(() => refresh(), 1000);
      });
    };

    onMounted(() => {
      socket.emit('version', (recvVersion: string) => version.value = recvVersion);
      refresh();
    });

    return {
      version, data, classNameMod, className, title, setDebug,
    };
  },
});
</script>
