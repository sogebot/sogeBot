<template>
    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block v-b-toggle="'tts-accordion-' + uuid" variant="light" class="text-left">{{translate('registry.alerts.tts.setting')}}</b-button>
      </b-card-header>
      <b-collapse :id="'tts-accordion-' + uuid" :accordion="'tts-accordion-' + uuid" role="tabpanel">
        <b-card-body v-if="state.loaded === $state.success">
          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label-for="'tts-enabled' + uuid"
            :label="translate('registry.alerts.enabled')"
          >
            <b-form-checkbox v-bind:key="'tts-enabled' + uuid" :id="'tts-enabled' + uuid" v-model="TTSData.enabled" :name="'tts-enabled' + uuid" switch></b-form-checkbox>
          </b-form-group>

          <b-form-group
            v-if="TTSData.minAmountToPlay"
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.minAmountToPlay.name')"
            :label-for="'tts-minAmountToPlay' + uuid"
          >
            <b-form-input
              :id="'tts-minAmountToPlay' + uuid"
              v-model="TTSData.minAmountToPlay"
              type="number"
              min="0"
              :placeholder="translate('registry.alerts.minAmountToPlay.placeholder')"
            >
            ></b-form-input>
          </b-form-group>

          <b-form-group
            v-if="TTSData.skipUrls"
            label-cols-sm="4"
            label-cols-lg="3"
            :label-for="'tts-skipUrls' + uuid"
            :label="translate('registry.alerts.skipUrls')"
          >
            <b-form-checkbox v-bind:key="'tts-skipUrls' + uuid" :id="'tts-skipUrls' + uuid" v-model="TTSData.skipUrls" :name="'tts-skipUrls' + uuid" switch></b-form-checkbox>
          </b-form-group>

          <b-form-group
            v-if="TTSData.keepAlertShown"
            label-cols-sm="4"
            label-cols-lg="3"
            :label-for="'tts-keepAlertShown' + uuid"
            :label="translate('registry.alerts.keepAlertShown')"
          >
            <b-form-checkbox v-bind:key="'tts-keepAlertShown' + uuid" :id="'tts-keepAlertShown' + uuid" v-model="TTSData.keepAlertShown" :name="'tts-keepAlertShown' + uuid" switch></b-form-checkbox>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
              :label="translate('registry.alerts.voice')">
            <b-form-select v-model="TTSData.voice" :options="voices" plain></b-form-select>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.volume')"
                  :label-for="'volume' + uuid">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'volume' + uuid"
                v-model.number="TTSData.volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ Number(TTSData.volume * 100).toFixed(0) + '%' }}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.rate')"
                  :label-for="'rate' + uuid">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'rate' + uuid"
                v-model.number="TTSData.rate"
                type="range"
                min="0"
                max="1.5"
                step="0.1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ String(TTSData.rate) }}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.pitch')"
                  :label-for="'pitch' + uuid">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'pitch' + uuid"
                v-model.number="TTSData.pitch"
                type="range"
                min="0"
                max="2"
                step="0.1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ String(TTSData.pitch) }}
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
import {
  defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';

import type { CommonSettingsInterface } from 'src/bot/database/entity/alert';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import translate from 'src/panel/helpers/translate';

declare global {
  interface Window {
    responsiveVoice: any;
  }
}

export default defineComponent({
  props: {
    tts:  Object,
    uuid: String,
  },
  setup(props: { tts: Partial<CommonSettingsInterface['tts']>, uuid: string}, ctx) {
    const text = ref('This message should be said by TTS to test your settings.');
    const state = ref({ loaded: ButtonStates.progress } as { loaded: number });
    const TTSData = ref(props.tts);
    const voices = ref([] as {text: string; value: string}[]);

    function initResponsiveVoice() {
      if (typeof window.responsiveVoice === 'undefined') {
        setTimeout(() => initResponsiveVoice(), 200);
        return;
      }
      window.responsiveVoice.init();
      voices.value = window.responsiveVoice.getVoices().map((o: { name: string }) => {
        return { text: o.name, value: o.name };
      });
      state.value.loaded = ButtonStates.success;
    }

    async function speak() {
      for (const toSpeak of text.value.split('/ ')) {
        await new Promise<void>(resolve => {
          if (toSpeak.trim().length === 0) {
            setTimeout(() => resolve(), 500);
          } else {
            window.responsiveVoice.speak(toSpeak.trim(), TTSData.value.voice, {
              rate: TTSData.value.rate, pitch: TTSData.value.pitch, volume: TTSData.value.volume, onend: () => setTimeout(() => resolve(), 500),
            });
          }
        });
      }
    }

    onMounted(() => {
      state.value.loaded = ButtonStates.progress;
      if (ctx.root.$store.state.configuration.integrations.ResponsiveVoice.api.key.trim().length === 0) {
        state.value.loaded = ButtonStates.fail;
      } else {
        if (typeof window.responsiveVoice === 'undefined') {
          ctx.root.$loadScript('https://code.responsivevoice.org/responsivevoice.js?key=' + ctx.root.$store.state.configuration.integrations.ResponsiveVoice.api.key)
            .then(() => initResponsiveVoice());
        } else {
          state.value.loaded = ButtonStates.success;
          voices.value = window.responsiveVoice.getVoices().map((o: { name: string }) => {
            return { text: o.name, value: o.name };
          });
        }
      }
    });

    watch(TTSData, (val) => {
      ctx.emit('update:tts', val);
    }, { deep: true });

    return {
      voices,
      TTSData,
      state,
      text,
      translate,
      speak,
    };
  },
});
</script>