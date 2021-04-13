<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-commercial')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item(target="_blank" href="/popout/#commercial")
                  | {{ translate('popout') }}
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'commercial'))" class="text-danger"
                    v-html="translate('remove-widget').replace('$name', translate('widget-title-commercial'))")
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-commercial') }}

        b-tab(active)
          template(v-slot:title)
            fa(icon="dollar-sign" fixed-width)
          b-card-text
            b-row(v-if="countdown === 0").px-3
              b-col.p-0.pr-1
                b-form-input(v-model="value" max="180" min="30" step="30" type="range")
              b-col.p-0
                b-button(size="sm" @click="run").btn-block Run commercial ({{ formatTime() }})
            hr(v-else style="border-width: 2px;margin: auto; margin-top: 1em;" :style="{animation: 'shrink-commercial-animation ' + value + 's'}").border-primary.shrink-animation
</template>

<script>
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';

import { EventBus } from 'src/panel/helpers/event-bus';

export default {
  props: ['popout', 'nodrag'],
  data:  function () {
    return {
      translate,
      EventBus,
      socket:    getSocket('/systems/commercial'),
      countdown: 0,
      value:     30,
      interval:  [],
    };
  },
  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  },
  created: function () {
    this.interval.push(setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      }
    }, 1000));
  },
  methods: {
    formatTime() {
      const minutes = Math.trunc(this.value / 60);
      const seconds = this.value - (minutes * 60) || '00';
      return `${minutes}:${seconds}`;
    },
    run: function () {
      this.countdown = this.value;
      this.socket.emit('commercial.run', { seconds: this.value });
    },
  },
};
</script>

<style>
@keyframes shrink-commercial-animation {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}
</style>