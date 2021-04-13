<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-social')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item(target="_blank" href="/popout/#social")
                  | {{ translate('popout') }}
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'social'))" class="text-danger"
                    v-html="translate('remove-widget').replace('$name', translate('widget-title-social'))")
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-social') }}

        b-tab(active)
          template(v-slot:title)
            fa(icon='share-square' fixed-width)
          b-card-text
            loading(v-if="state.loading === $state.progress")
            div(
              v-else v-for="(item, index) of items"
              :key="index"
              class="list-group-item"
              style="border-left: 0; border-right: 0; padding: 0.2rem 1.25rem 0.4rem 1.25rem"
            )
              strong {{item.username}}
              p.mb-0 {{ item.text }}
              a(:href="item.url").d-block.text-right
                fa(:icon="['fab', 'twitter']" v-if="item.type === 'twitter'")
                | {{ dayjs(item.timestamp).format('LLL') }}

        b-tab
          template(v-slot:title)
            fa(icon="question" fixed-width)
          b-card-text
            dl
              dt Why is this widget empty?
              dd To fill social widget, you need to add tweet events with hashtags. Then all new posts will be added to this widget.
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import Vue from 'vue';

import { EventBus } from 'src/panel/helpers/event-bus';

export default Vue.extend({
  components: { loading: () => import('src/panel/components/loading.vue') },
  props:      ['popout', 'nodrag'],
  data:       function () {
    const data: {
      EventBus: any,
      items: Array<Record<string, any>>,
      socket: any,
      state: { loading: number },
      interval: number,
      translate: any,
    } = {
      translate,
      EventBus,
      socket:   getSocket('/widgets/social'),
      items:    [],
      state:    { loading: this.$state.progress },
      interval: 0,
    };
    return data;
  },
  mounted: function () {
    this.$emit('mounted');
    this.load();
    this.interval = window.setInterval(() => {
      this.load();
    }, 10000);
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  methods: {
    load() {
      this.socket.emit('generic::getAll', { limit: 50 }, (err: string | null, d: Array<Record<string, any>>) => {
        if (err) {
          return console.error(err);
        }
        this.items = d;
        this.state.loading = this.$state.success;
      });
    },
  },
});
</script>
