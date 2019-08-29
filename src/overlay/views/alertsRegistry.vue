<template>
  <div>
    <template v-if="state.loaded === $state.success">
      <div v-if="urlParam('debug')" class="debug">
        <json-viewer :value="data" boxed></json-viewer>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import JsonViewer from 'vue-json-viewer'
import io from 'socket.io-client';

@Component({
  components: {
    JsonViewer
  }
})
export default class AlertsRegistryOverlays extends Vue {
  socket = io('/registries/alerts', {query: "token="+this.token});

  state: {
    loaded: number,
  } = {
    loaded: this.$state.progress,
  }

  id: null | string = null;
  data: null | Registry.Alerts.Alert = null;
  defaultProfanityList: string[] = [];

  mounted() {
    this.id = this.$route.params.id
    this.socket.emit('findOne', { where: { id: this.id }}, (err, data: Registry.Alerts.Alert) => {
      this.data = data;

      for (const [lang, isEnabled] of Object.entries(this.data.loadStandardProfanityList)) {
        if (isEnabled) {
          let list = require('../../bot/data/vulgarities/' + lang + '.txt');
          this.defaultProfanityList = [...this.defaultProfanityList, ...list.default.split(/\r?\n/)]
        }
      }

      this.defaultProfanityList = [
        ...this.defaultProfanityList,
        ...data.customProfanityList.split(',').map(o => o.trim()),
      ]

      console.debug('Profanity list', this.defaultProfanityList);
      this.state.loaded = this.$state.success;
    })
  }
}
</script>

<style scoped>
  .debug {
    z-index: 9999;
    background-color: rgba(255, 255, 255, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }
</style>