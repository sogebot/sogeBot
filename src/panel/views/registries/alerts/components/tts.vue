<template>
    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block href="#" v-b-toggle.tts-accordion variant="light" class="text-left">{{translate('registry.alerts.tts.setting')}}</b-button>
      </b-card-header>
      <b-collapse id="tts-accordion" accordion="my-accordion" role="tabpanel">
        <b-card-body v-if="state.loaded === $state.success">
          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label-for="'tts-enabled' + uuid"
            :label="translate('registry.alerts.enabled')"
          >
            <b-form-checkbox v-bind:key="'tts-enabled' + uuid" :id="'tts-enabled' + uuid" v-model="data.enabled" :name="'tts-enabled' + uuid" switch></b-form-checkbox>
          </b-form-group>

          <b-form-group
            v-if="data.minAmountToPlay"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.minAmountToPlay.name')"
            :label-for="'tts-minAmountToPlay' + uuid"
          >
            <b-form-input
              :id="'tts-minAmountToPlay' + uuid"
              v-model="data.minAmountToPlay"
              type="number"
              min="0"
              :placeholder="translate('registry.alerts.minAmountToPlay.placeholder')"
            >
            ></b-form-input>
          </b-form-group>

          <b-form-group
            v-if="data.skipUrls"
            label-cols-sm="4"
            label-cols-lg="3"
            :label-for="'tts-skipUrls' + uuid"
            :label="translate('registry.alerts.skipUrls')"
          >
            <b-form-checkbox v-bind:key="'tts-skipUrls' + uuid" :id="'tts-skipUrls' + uuid" v-model="data.skipUrls" :name="'tts-skipUrls' + uuid" switch></b-form-checkbox>
          </b-form-group>

          <b-form-group
            v-if="data.keepAlertShown"
            label-cols-sm="4"
            label-cols-lg="3"
            :label-for="'tts-keepAlertShown' + uuid"
            :label="translate('registry.alerts.keepAlertShown')"
          >
            <b-form-checkbox v-bind:key="'tts-keepAlertShown' + uuid" :id="'tts-keepAlertShown' + uuid" v-model="data.keepAlertShown" :name="'tts-keepAlertShown' + uuid" switch></b-form-checkbox>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
              :label="translate('registry.alerts.voice')">
            <b-form-select v-model="data.voice" :options="voices" plain></b-form-select>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.volume')"
                  label-for="volume">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="volume"
                v-model.number="data.volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ Number(data.volume * 100).toFixed(0) + '%' }}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.rate')"
                  label-for="rate">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="rate"
                v-model="data.rate"
                type="range"
                min="0"
                max="1.5"
                step="0.1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ String(data.rate) }}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.pitch')"
                  label-for="pitch">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="pitch"
                v-model="data.pitch"
                type="range"
                min="0"
                max="2"
                step="0.1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ String(data.pitch) }}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
              :label="translate('registry.alerts.test')">
            <b-textarea v-model="text"/>
            <b-button type="button" @click="speak()" variant="primary" block>{{ translate('registry.alerts.test') }}</b-button>
          </b-form-group>
        </b-card-body>
        <b-card-body v-if="state.loaded === $state.fail">
          <b-alert show variant="info">
            ResponsiveVoices key is not properly set, go to
            <a href="#/settings/integrations/responsivevoice">ResponsiveVoice integration settings</a>
            and set your key.
          </b-alert>
        </b-card-body>
      </b-collapse>
    </b-card>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync } from 'vue-property-decorator';
import type { CommonSettingsInterface } from 'src/bot/database/entity/alert';

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
  @PropSync('tts') readonly data !: Partial<CommonSettingsInterface["tts"]>;
  @Prop() readonly uuid !: string;

  text = "This message should be said by TTS to test your settings.";
  state: { loaded: number } = { loaded: this.$state.progress }

  voices: {text: string; value: string}[] = [];

  beforeDestroy() {
    if (this.state.loaded === this.$state.success) {
      this.$unloadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.configuration.integrations.ResponsiveVoice.api.key).catch(() => {});
    }
  }

  mounted() {
    this.state.loaded = this.$state.progress;
    if (this.configuration.integrations.ResponsiveVoice.api.key.trim().length === 0) {
      this.state.loaded = this.$state.fail;
    } else {
      if (typeof window.responsiveVoice === 'undefined') {
        this.$loadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.configuration.integrations.ResponsiveVoice.api.key)
          .then(() => this.initResponsiveVoice());
      } else {
        this.state.loaded = this.$state.success;
      }
    }
  }

  initResponsiveVoice() {
    if (typeof window.responsiveVoice === 'undefined') {
      return setTimeout(() => this.initResponsiveVoice(), 200);
    }
    window.responsiveVoice.init();
    this.voices = window.responsiveVoice.getVoices().map(o => {
      return { text: o.name, value: o.name }
    });
    this.state.loaded = this.$state.success;
  }

  speak() {
    window.responsiveVoice.speak(this.text, this.data.voice, { rate: this.data.rate, pitch: this.data.pitch, volume: this.data.volume });
  }
}
</script>