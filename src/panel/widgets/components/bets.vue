<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="!nodrag").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-bets')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'bets'))" class="text-danger"
                    v-html="translate('remove-widget').replace('$name', translate('widget-title-bets'))")
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-bets') }}

        b-tab(active)
          template(v-slot:title)
            fa(:icon='["far", "clock"]' fixed-width)
            template(v-if="!arePointsGiven") {{ timer | formatTime }} {{title}}
          b-card-text
            template(v-if="!arePointsGiven")
              div(v-for="(option, index) of options" :key="option").pb-2
                div(@click="close(index)" style="cursor: pointer;")
                  b-progress(height="2rem" striped animated show-progress show-value)
                    b-progress-bar(:value="getBetsPercentage(index)")
                      span(
                        style="font-size: 1rem; text-shadow: 0px 0px 1px black, 0px 0px 2px black, 0px 0px 3px black, 0px 0px 4px black, 0px 0px 5px black, 0px 0px 6px black; position: absolute").ml-1.mr-1 {{ option }} ({{ getBets(index) }})
              div.pb-2
                button(@click="close('refund')").btn.btn-block.btn-danger.p-1.text-left
                  | {{ capitalize(translate('refund')) }}
            div(v-else).alert.alert-info No bets are currently running
        b-tab
          template(v-slot:title)
            fa(icon='cog')
          b-card-text
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('gain-every-option')}}
              input(type="number" v-model.number="betPercentGain").form-control
              div.input-group-append
                span.input-group-text %
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, onUnmounted, ref, watch,
} from '@vue/composition-api';

import type { BetsInterface, BetsParticipationsInterface } from 'src/bot/database/entity/bets';
import { capitalize } from 'src/panel/helpers/capitalize';
import { error } from 'src/panel/helpers/error';
import { EventBus } from 'src/panel/helpers/event-bus';

type Props = {
  popout: boolean;
  nodrag: boolean;
};

const socket = getSocket('/systems/bets');

export default defineComponent({
  filters: {
    formatTime: (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [
        h,
        m > 9 ? m : (h ? '0' + m : m || '0'),
        s > 9 ? s : '0' + s,
      ].filter(a => a).join(':');
    },
  },
  props: {
    popout: Boolean,
    nodrag: Boolean,
  },
  setup(props: Props, ctx) {
    const betPercentGain = ref(0);
    const locked = ref(false);
    const options = ref([] as string[]);
    const timer = ref(null as null | number);
    const title = ref('');
    const arePointsGiven = ref(false);
    const interval = ref([] as number[]);
    const bets = ref([] as BetsParticipationsInterface[]);

    watch(betPercentGain, (value, old) => {
      socket.emit('settings.update', { betPercentGain: Number(value) }, () => {
        return;
      });
    });

    onMounted(() => {
      interval.value.push(
        window.setInterval(() => socket.emit('bets::getCurrentBet', (err: string | null, _current: Required<BetsInterface>) => {
          if (err) {
            return error(err);
          }
          if (_current) {
            locked.value = _current.isLocked;
            options.value = _current.options;
            timer.value = Number(Number((Number(_current.endedAt) - new Date().getTime()) / 1000).toFixed(0));
            if (timer.value <= 0) {
              timer.value = 0;
            }
            title.value = _current.title;
            bets.value = _current.participations;
            arePointsGiven.value = _current.arePointsGiven;
          } else {
            title.value = '';
            arePointsGiven.value = true;
            timer.value = null,
            options.value = [];
          }
        }), 1000),
      );
      socket.emit('settings', (err: string | null, settings: {[x: string]: any}) => {
        betPercentGain.value = settings.betPercentGain[0];
      });
    });
    onUnmounted(() => {
      for(const i of interval.value) {
        clearInterval(i);
      }
    });

    const close = (index: number) => {
      socket.emit('bets::close', index);
    };
    const getBetsPercentage = (index: number) => {
      if (bets.value.length === 0) {
        return 0;
      }

      const percentage = (100 / bets.value.length) * bets.value.filter(o => Number(o.optionIdx) === Number(index)).length + '%';
      return percentage === '0%' ? '0' : percentage;
    };
    const getBets = (index: number) => {
      return bets.value.filter(o => Number(o.optionIdx) === Number(index)).length;
    };

    return {
      betPercentGain,
      locked,
      options,
      timer,
      title,
      arePointsGiven,
      interval,
      bets,
      close,
      getBetsPercentage,
      getBets,
      capitalize,
      EventBus,
      translate,
    };
  },
});
</script>
