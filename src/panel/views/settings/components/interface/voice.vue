<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else-if="typeof translatedTitle === 'object'">
          {{ translatedTitle.title }}
          <small
            style="cursor: help;"
            class="text-info ml-1"
            data-toggle="tooltip"
            data-html="true"
            :title="translatedTitle.help"
          >[?]</small>
        </template>
      </span>
    </div>
    <div
      v-if="loading === 0"
      class="form-control"
    >
      <b-spinner
        variant="primary"
        small
      /> {{ translate('loading') }}
    </div>
    <div
      v-else-if="loading === 1"
      class="form-control is-invalid alert-danger"
      v-html="translate('overlays.texttospeech.settings.responsiveVoiceKeyNotSet')"
    />
    <b-form-select
      v-else
      v-model="currentValue"
      :options="voices"
      plain
    />
  </div>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';

declare global {
  interface Window {
    responsiveVoice: any;
  }
}

export default defineComponent({
  props: {
    value: String,
    title: String,
  },
  setup(props: { value: string; title: string }, ctx) {
    const currentValue = ref(props.value);
    const translatedTitle = ref(translate(props.title));
    const voices = ref([] as { text: string, value: string}[]);
    const loading = ref(0);

    watch(currentValue, (val) => {
      ctx.emit('update', { value: val });
    });

    onMounted(() => {
      init();
    });

    function init() {
      if (ctx.root.$store.state.configuration.integrations.ResponsiveVoice.api.key.trim().length > 0) {
        if (typeof window.responsiveVoice === 'undefined') {
          ctx.root.$loadScript('https://code.responsivevoice.org/responsivevoice.js?key=' + ctx.root.$store.state.configuration.integrations.ResponsiveVoice.api.key)
            .then(() => initResponsiveVoice(0));
        } else {
          loadVoices();
        }
      } else {
        loading.value = 1;
      }
    }

    function loadVoices() {
      voices.value = window.responsiveVoice.getVoices().map((o: { name: string }) => {
        return { text: o.name, value: o.name };
      });
      loading.value = 2;
    }

    function initResponsiveVoice(retry = 0) {
      if (typeof window.responsiveVoice === 'undefined') {
        if (retry === 10) {
          loading.value = 1;
          return;
        }
        setTimeout(() => initResponsiveVoice(retry+1), 200);
        return;
      }
      window.responsiveVoice.init();
      loadVoices();
    }

    return {
      currentValue,
      translatedTitle,
      voices,

      translate,
    };
  },
});
</script>