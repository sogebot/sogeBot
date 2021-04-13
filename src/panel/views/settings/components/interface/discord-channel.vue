<template>
  <div>
    <div
      v-if="Array.isArray(currentValue) || typeof currentValue === 'string'"
      class="d-flex"
    >
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
          <template v-else>
            {{ translatedTitle.title }}
            <small
              class="text-info"
              data-toggle="tooltip"
              data-html="true"
              :title="translatedTitle.help"
            >[?]</small>
          </template>
        </span>
      </div>
      <template v-if="Array.isArray(currentValue)">
        <div class="w-100">
          <b-form-select
            v-for="(value, index) of currentValue"
            :key="'dc-' + index"
            v-model="currentValue[index]"
            :options="channels"
          />
        </div>
      </template>
      <b-form-select
        v-if="typeof currentValue === 'string'"
        v-model="currentValue"
        :options="channels"
      />
    </div>
    <h4 v-else>
      <title-divider>
        <template v-if="typeof translatedTitle === 'string'">
          {{ translatedTitle }}
        </template>
        <template v-else>
          {{ translatedTitle.title }}
          <small
            class="text-info"
            data-toggle="tooltip"
            data-html="true"
            :title="translatedTitle.help"
          >[?]</small>
        </template>
      </title-divider>
    </h4>

    <template v-if="typeof currentValue === 'object' && !Array.isArray(currentValue)">
      <div
        v-for="key of Object.keys(currentValue)"
        :key="key"
        class="d-flex"
      >
        <div class="input-group-prepend">
          <span class="input-group-text">
            {{ key }}
          </span>
        </div>
        <b-form-select
          v-model="currentValue[key]"
          :options="channels"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { isEqual } from 'lodash';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';

import { announceTypes } from 'src/bot/helpers/commons';

type Channel = { text: string, value: string };

@Component({ components: { 'title-divider': () => import('src/panel/components/title-divider.vue') } })
export default class discordChannel extends Vue {
  @Prop() readonly value!: string[] | string | { [key in typeof announceTypes[number]]: string };
  @Prop() readonly title!: string;

  socket = getSocket('/integrations/discord');
  channels: Channel[] = [];

  currentValue = this.value;
  translatedTitle = translate(this.title);

  mounted() {
    if (typeof this.currentValue === 'string' && this.title.includes('listenAtChannels')) {
      this.currentValue = [this.currentValue];
    }

    this.socket.emit('discord::getChannels', (err: string | null, channels: Channel[]) => {
      console.groupCollapsed('discord::getChannels');
      console.log({ channels });
      console.groupEnd();
      if (err) {
        return console.error(err);
      }

      // find channel in channels on current or unset current
      if (typeof this.currentValue !== 'object' || Array.isArray(this.currentValue)) {
        if (Array.isArray(this.currentValue)) {
          this.currentValue.forEach((value, idx) => {
            if (!channels.find(o => String(o.value) === String(value))) {
              value = '';
            }
          });
        } else {
          if (!channels.find(o => String(o.value) === String(this.currentValue))) {
            this.currentValue = '';
          }
        }
      } else {
        for (const key of Object.keys(this.currentValue) as Writeable<typeof announceTypes>) {
          if (!channels.find(o => {
            return typeof this.currentValue === 'object' && String(o.value) === String((this.currentValue as any)[key]);
          })) {
            this.currentValue[key] = '';
          }
        }
      }
      this.channels = [{ value: '', text: `-- ${translate('integrations.discord.settings.noChannelSelected')} --` }, ...channels];
    });
  }

  @Watch('currentValue', { deep: true })
  onChange() {
    if (Array.isArray(this.currentValue)) {
      // remove all empty arrays
      const newCurrentValue = [...this.currentValue.filter(o => o !== ''), ''];
      console.log({ newCurrentValue, cur: this.currentValue });
      if (!isEqual(this.currentValue, newCurrentValue)) {
        this.currentValue = newCurrentValue;
      }
    }
    this.$emit('update', { value: this.currentValue });
  }
}
</script>
