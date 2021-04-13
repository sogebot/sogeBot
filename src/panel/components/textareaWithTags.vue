<template>
  <div
    style="flex: 1 1 auto; height: fit-content; height: -moz-fit-content;"
    class="border-0 p-0 m-0 d-flex"
    :class="{ 'is-invalid': error || state === false }"
  >
    <textarea
      v-show="editation"
      ref="textarea"
      v-model="_value"
      style="min-height: 6em;"
      :placeholder="placeholder"
      class="form-control"
      :style="heightStyle"
      @keydown.enter="onEnter"
      @blur="editation = false"
    />

    <div
      v-show="!editation && _value.trim().length === 0"
      ref="placeholderRef"
      class="form-control"
      style="cursor: text; overflow: auto; resize: vertical; min-height: 6em;"
      :class="{ 'is-invalid': error || state === false }"
      :style="heightStyle"
      @click="editation=true"
    >
      <span
        class="text-muted"
        v-html="d_placeholder"
      />
    </div>

    <div
      v-show="!editation && _value.trim().length > 0"
      ref="div"
      class="form-control"
      style="word-break: break-all; cursor: text; overflow: auto; resize: vertical; min-height: 6em;"
      :class="{ 'is-invalid': error || state === false }"
      :style="heightStyle"
      @click="editation=true"
      v-html="$options.filters.filterize(_value)"
    />

    <div v-if="filters && filters.length > 0">
      <b-dropdown
        id="dropdown-1"
        variant="dark"
        class="h-100"
        :dropleft="true"
        menu-class="dropdown-scroll"
      >
        <template v-for="filter of filters">
          <template v-if="filter === 'global'">
            <b-dropdown-item
              :key="filter + 'title'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('title')"
            >
              {{ translate('responses.variable.title') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'game'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('game')"
            >
              {{ translate('responses.variable.game') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'viewers'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('viewers')"
            >
              {{ translate('responses.variable.viewers') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'views'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('views')"
            >
              {{ translate('responses.variable.views') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'followers'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('followers')"
            >
              {{ translate('responses.variable.followers') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'subscribers'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('subscribers')"
            >
              {{ translate('responses.variable.subscribers') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'spotifySong'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('spotifySong')"
            >
              {{ translate('responses.variable.spotifySong') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'ytSong'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('ytSong')"
            >
              {{ translate('responses.variable.ytSong') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestFollower'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestFollower')"
            >
              {{ translate('responses.variable.latestFollower') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestSubscriber'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestSubscriber')"
            >
              {{ translate('responses.variable.latestSubscriber') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestSubscriberMonths'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestSubscriberMonths')"
            >
              {{ translate('responses.variable.latestSubscriberMonths') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestSubscriberStreak'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestSubscriberStreak')"
            >
              {{ translate('responses.variable.latestSubscriberStreak') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestTipAmount'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestTipAmount')"
            >
              {{ translate('responses.variable.latestTipAmount') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestTipCurrency'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestTipCurrency')"
            >
              {{ translate('responses.variable.latestTipCurrency') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestTipMessage'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestTipMessage')"
            >
              {{ translate('responses.variable.latestTipMessage') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestTip'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestTip')"
            >
              {{ translate('responses.variable.latestTip') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.overall.username'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.overall.username')"
            >
              {{ translate('responses.variable.toptip.overall.username') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.overall.amount'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.overall.amount')"
            >
              {{ translate('responses.variable.toptip.overall.amount') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.overall.currency'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.overall.currency')"
            >
              {{ translate('responses.variable.toptip.overall.currency') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.overall.message'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.overall.message')"
            >
              {{ translate('responses.variable.toptip.overall.message') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.stream.username'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.stream.username')"
            >
              {{ translate('responses.variable.toptip.stream.username') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.stream.amount'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.stream.amount')"
            >
              {{ translate('responses.variable.toptip.stream.amount') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.stream.currency'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.stream.currency')"
            >
              {{ translate('responses.variable.toptip.stream.currency') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'toptip.stream.message'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('toptip.stream.message')"
            >
              {{ translate('responses.variable.toptip.stream.message') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestCheerAmount'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestCheerAmount')"
            >
              {{ translate('responses.variable.latestCheerAmount') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestCheerMessage'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestCheerMessage')"
            >
              {{ translate('responses.variable.latestCheerMessage') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'latestCheer'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('latestCheer')"
            >
              {{ translate('responses.variable.latestCheer') }}
            </b-dropdown-item>
            <b-dropdown-item
              :key="filter + 'isBotSubscriber'"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable('isBotSubscriber')"
            >
              {{ translate('responses.variable.isBotSubscriber') }}
            </b-dropdown-item>
          </template>
          <template v-else>
            <b-dropdown-item
              :key="filter"
              class="dropdown-item"
              style="cursor: pointer"
              @click="addVariable(filter)"
            >
              {{ translate('responses.variable.' + filter) }}
            </b-dropdown-item>
          </template>
        </template>
        <template slot="button-content">
          <fa
            icon="dollar-sign"
            size="lg"
          />
        </template>
      </b-dropdown>
    </div>
  </div>
</template>
<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, Ref, ref, watch,
} from '@vue/composition-api';
import {
  isNil, keys, sortBy,
} from 'lodash-es';

import { flatten } from '../../bot/helpers/flatten';

interface Props {
  value: string;
  filters: any[];
  error?: boolean;
  placeholder?: string;
  state: boolean | null;
}

export default defineComponent({
  filters: {
    filterize: function (val: string) {
      const filtersRegExp = new RegExp('\\$(' + sortBy(keys(flatten(translate('responses.variable', true))), (o) => -o.length).join('|') + ')', 'g');
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const matches = val.match(filtersRegExp);
      let output = val;
      if (!isNil(matches)) {
        for (const match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`);
        }
      }
      return output;
    },
  },
  props: {
    value:       String,
    filters:     Array,
    error:       Boolean,
    placeholder: String,
    state:       [Boolean, Object],
  },
  setup(props: Props, context) {
    const height = ref(0);
    const editation = ref(false);
    const d_placeholder = !props.placeholder || props.placeholder.trim().length === 0 ? '&nbsp;' : props.placeholder;
    const _value = ref(props.value);

    // refs
    const textarea: Ref<HTMLElement | null> = ref(null);
    const placeholderRef: Ref<HTMLElement | null> = ref(null);
    const div: Ref<HTMLElement | null> = ref(null);

    const heightStyle = computed(() => {
      if (height.value === 0) {
        return 'height: auto';
      }
      return `height: ${height.value + 2}px`;
    });

    watch(_value, (val) => {
      context.emit('update:value', val);
      context.emit('input');
    });
    watch(editation, (val, old) => {
      if (textarea.value && placeholderRef.value && div.value) {
        if (val) {
          // focus textarea and set height
          if (_value.value.trim().length === 0) {
            height.value = placeholderRef.value.clientHeight;
          } else {
            height.value = div.value.clientHeight;
          }
          context.root.$nextTick(() => {
            textarea.value?.focus();
          });
        } else {
          // texteare unfocused, set height of div
          height.value = textarea.value.clientHeight;
        }
      }
    });

    const onEnter = (e: Event) => {
      // don't add newline
      e.stopPropagation();
      e.preventDefault();
      e.returnValue = false;
      _value.value = (e.target as any).value;
    };

    const addVariable = (variable: string) => {
      _value.value = _value.value + ' $' + variable;
      editation.value = true;
      context.root.$nextTick(() => {
        window.setTimeout(() => {
          if (textarea.value) {
            textarea.value.focus();
          }
        }, 10);
      });
    };

    return {
      height,
      editation,
      d_placeholder,
      heightStyle,
      _value,
      onEnter,
      addVariable,
      textarea,
      placeholderRef,
      div,
      translate,
    };
  },
});
</script>

<style>
.dropdown-scroll {
  height: 200px !important;
  overflow-y: scroll;
  overflow-x: hidden;
}
</style>