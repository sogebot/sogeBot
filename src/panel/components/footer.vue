<template>
  <footer class="footer">
    <span class="alert" :class="[className(data.API)]" style="padding:0;" :title="'API ' + title(data.API)">API</span>
    <span class="alert" :class="[className(data.TMI)]" style="padding:0;" :title="'TMI ' + title(data.TMI)">TMI</span>
    <span class="alert" :class="[classNameMod(data.SOC)]" style="padding:0;" :title="'SOC ' + (data.SOC ? 'connected' : 'disconnected')">SOC</span>
    <span class="alert" :class="[classNameMod(data.MOD)]" style="padding:0;" :title="'Bot is ' + (data.MOD ? ' ': 'not ') + 'a MOD.'">MOD</span>
    <span class="alert" :class="[classNameResponse(data.RES)]" style="padding:0;" :title="'Average bot response ' + data.RES + 'ms'">{{data.RES}}ms</span>
    <a href="https://github.com/sogehige/SogeBot">GitHub</a> |
    <a href="https://github.com/sogehige/SogeBot/issues">Issues</a> |
    <a href="https://github.com/sogehige/SogeBot/blob/master/LICENSE">GPL-3.0 License</a>
  </footer>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from '../helpers/socket';

@Component({})
export default class Menu extends Vue {
  socket = getSocket('/');

  data: {
    SOC: boolean;
    MOD: boolean;
    RES: number;
    API: 0 | 1 | 2 | 3;
    TMI: 0 | 1 | 2 | 3;
  } = {
    SOC: false,
    MOD: false,
    RES: 0,
    API: 0,
    TMI: 0
  }

  classNameMod(is: boolean) {
    return is ? 'alert-success' : 'alert-danger';
  }

  classNameResponse(ms: number) {
    if (ms >= 1500) {
      return 'alert-danger'
    } else if (ms < 1500 && ms >= 800) {
      return 'alert-warning'
    } else {
      return 'alert-success'
    }
  }

  className (status: 0 | 1 | 2 | 3) {
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

  title(status: 0 | 1 | 2 | 3) {
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

  mounted() {
    this.refresh();
  }

  refresh() {
    this.socket.emit('connection_status', (data: {
      SOC: boolean;
      MOD: boolean;
      RES: number;
      API: 0 | 1 | 2 | 3;
      TMI: 0 | 1 | 2 | 3;
    }) => {
      this.data = data;
      this.data.SOC = true;
      setTimeout(() => this.refresh(), 1000);
    })
  }
}
</script>
