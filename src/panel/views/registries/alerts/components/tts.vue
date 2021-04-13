<template>
  <b-card no-body>
    <b-card-header
      header-tag="header"
      class="p-1"
      role="tab"
    >
      <b-button
        v-b-toggle="'tts-accordion-' + uuid"
        block
        variant="light"
        class="text-left"
      >
        {{ translate('registry.alerts.tts.setting') }}
      </b-button>
    </b-card-header>
    <b-collapse
      :id="'tts-accordion-' + uuid"
      :accordion="'tts-accordion-' + uuid"
      role="tabpanel"
    >
      <b-card-body v-if="state.loaded === $state.success">
        <b-form-group
          label-cols-sm="4"
          label-cols-lg="3"
          :label-for="'tts-enabled' + uuid"
          :label="translate('registry.alerts.enabled')"
        >
          <b-form-checkbox
            :id="'tts-enabled' + uuid"
            :key="'tts-enabled' + uuid"
            v-model="TTSData.enabled"
            :name="'tts-enabled' + uuid"
            switch
          />
        </b-form-group>

        <b-form-group
          v-if="typeof TTSData.minAmountToPlay !== 'undefined'"
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
            >
          </b-form-input>
        </b-form-group>

        <b-form-group
          v-if="TTSData.skipUrls"
          label-cols-sm="4"
          label-cols-lg="3"
          :label-for="'tts-skipUrls' + uuid"
          :label="translate('registry.alerts.skipUrls')"
        >
          <b-form-checkbox
            :id="'tts-skipUrls' + uuid"
            :key="'tts-skipUrls' + uuid"
            v-model="TTSData.skipUrls"
            :name="'tts-skipUrls' + uuid"
            switch
          />
        </b-form-group>

        <b-form-group
          v-if="TTSData.keepAlertShown"
          label-cols-sm="4"
          label-cols-lg="3"
          :label-for="'tts-keepAlertShown' + uuid"
          :label="translate('registry.alerts.keepAlertShown')"
        >
          <b-form-checkbox
            :id="'tts-keepAlertShown' + uuid"
            :key="'tts-keepAlertShown' + uuid"
            v-model="TTSData.keepAlertShown"
            :name="'tts-keepAlertShown' + uuid"
            switch
          />
        </b-form-group>
      </b-card-body>
      <b-card-body v-if="state.loaded === $state.fail">
        <b-alert
          show
          variant="info"
        >
          ResponsiveVoices key is not properly set, go to
          <a href="#/settings/integrations/responsivevoice">ResponsiveVoice integration settings</a>
          and set your key.
        </b-alert>
      </b-card-body>
    </b-collapse>
  </b-card>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';

import type { CommonSettingsInterface } from 'src/bot/database/entity/alert';
import { ButtonStates } from 'src/panel/helpers/buttonStates';

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
    };
  },
});
</script>