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
    <b-form-select v-model="currentValue" :options="voices" plain></b-form-select>
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
  @Prop() readonly title: any;

  voices: { text: string, value: string}[] = [];
  currentValue = this.value;

  translatedTitle = this.translate(this.title);

  mounted() {
    if (this.configuration.integrations.ResponsiveVoice.api.key.trim().length > 0) {
      if (typeof window.responsiveVoice === 'undefined') {
        this.$loadScript("https://code.responsivevoice.org/responsivevoice.js?key=" + this.configuration.integrations.ResponsiveVoice.api.key)
          .then(() => this.initResponsiveVoice());
      } else {
        this.loadVoices();
      }
    }
  }

  loadVoices() {
    this.voices = window.responsiveVoice.getVoices().map(o => {
      return { text: o.name, value: o.name }
    });
  }

  initResponsiveVoice() {
    if (typeof window.responsiveVoice === 'undefined') {
      return setTimeout(() => this.initResponsiveVoice(), 200);
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