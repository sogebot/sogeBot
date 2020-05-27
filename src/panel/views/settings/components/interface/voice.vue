<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else-if="typeof translatedTitle === 'object'">
          {{ translatedTitle.title }}
          <small style="cursor: help;" class="text-info ml-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <div class="form-control" v-if="loading === 0">
      <b-spinner variant="primary" small /> {{ translate('loading') }}
    </div>
    <div class="form-control is-invalid alert-danger" v-else-if="loading === 1" v-html="translate('overlays.texttospeech.settings.responsiveVoiceKeyNotSet')" />
    <b-form-select v-else v-model="currentValue" :options="voices" plain></b-form-select>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

declare global {
  interface Window {
    responsiveVoice: any;
  }
}

@Component({})
export default class helpbox extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly title!: string;

  voices: { text: string, value: string}[] = [];
  currentValue = this.value;

  loading = 0;

  translatedTitle = this.translate(this.title);

  mounted() {
    this.init();
  }

  init() {
    if (this.configuration.integrations.ResponsiveVoice.api.key.trim().length > 0) {
      if (typeof window.responsiveVoice === 'undefined') {
        this.$loadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.configuration.integrations.ResponsiveVoice.api.key)
          .then(() => this.initResponsiveVoice(0));
      } else {
        this.loadVoices();
      }
    } else {
      this.loading = 1;
    }
  }

  loadVoices() {
    this.voices = window.responsiveVoice.getVoices().map((o: { name: string }) => {
      return { text: o.name, value: o.name }
    });
    this.loading = 2;
  }

  initResponsiveVoice(retry = 0) {
    if (typeof window.responsiveVoice === 'undefined') {
      if (retry === 10) {
        this.loading = 1;
        return;
      }
      setTimeout(() => this.initResponsiveVoice(retry+1), 200);
      return;
    }
    window.responsiveVoice.init();
    this.loadVoices();
  }

  @Watch('currentValue')
  emitUpdate() {
    this.$emit('update', { value: this.currentValue });
  }
}
</script>