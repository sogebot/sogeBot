<template>
    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block href="#" v-b-toggle.tts-accordion variant="light" class="text-left">{{translate('registry.alerts.tts.setting')}}</b-button>
      </b-card-header>
      <b-collapse id="tts-accordion" accordion="my-accordion" role="tabpanel">
        <b-card-body>
          <b-form-group label-cols-sm="4" label-cols-lg="3"
              :label="translate('registry.alerts.voices.name')">
            <b-form-select v-model="data.voice" :options="voices" plain></b-form-select>
          </b-form-group>
          <button type="button" @click="speak()" v-if="state.loaded === $state.success">Test</button>
        </b-card-body>
      </b-collapse>
    </b-card>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';

declare global {
  interface Window {
    responsiveVoice: any;
  }
}

@Component({
  components: {
  }
})
export default class TTS extends Vue {
  @PropSync('tts') readonly data !: Registry.Alerts.TTS;

  text = "Hello world!";
  state: { loaded: number } = { loaded: this.$state.progress }

  voices: {text: string; value: string}[] = [];

  beforeDestroy() {
    this.$unloadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.configuration.integrations.responsiveVoice.api.key)
  }

  mounted() {
    this.state.loaded = this.$state.progress;
    this.$loadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.configuration.integrations.responsiveVoice.api.key)
      .then(() => {
        window.responsiveVoice.init();
       this.voices = window.responsiveVoice.getVoices().map(o => {
          return { text: o.name, value: o.name }
        });
        this.state.loaded = this.$state.success;
      })
  }

  speak() {
    window.responsiveVoice.speak(this.text, this.data.voice);
  }
}
</script>