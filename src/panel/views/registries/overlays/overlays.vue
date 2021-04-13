<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.overlays') }}
        </span>
      </b-col>
    </b-row>

    <panel>
      <template #left>
        <button-with-icon
          class="btn-primary btn-reverse"
          icon="plus"
          @click="newItem"
        >
          {{ translate('registry.overlays.newMapping') }}
        </button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading !== ButtonStates.success" />
    <template v-else>
      <b-alert
        v-if="items.length === 0"
        show
      >
        {{ translate('registry.overlays.emptyMapping') }}
      </b-alert>
      <b-table
        :items="items"
        :fields="fields"
        bordered
        outlined
        class="hide-header w-auto m-auto table-light"
      >
        <template #cell(id)="data">
          <pre
            class="m-0"
            style="display: inline-block; padding: 0.5rem 0 0 0;"
          >{{ data.item.id }}</pre>
        </template>
        <template #cell(arrow)>
          <div style="display: inline-block; padding: 0.375rem 0.4rem;">
            <fa
              icon="chevron-right"
              fixed-width
            />
          </div>
        </template>
        <template #cell(overlay)="data">
          <b-form-select
            v-model="data.item.value"
            :options="options"
          />
        </template>
        <template #cell(buttons)="data">
          <button-with-icon
            :text="'/overlays/' + data.item.id"
            :href="'/overlays/' + data.item.id"
            class="btn-dark btn-only-icon"
            icon="link"
            target="_blank"
          />
          <button-with-icon
            v-b-tooltip.focus="'Copied!'"
            class="btn-only-icon btn-primary btn-reverse"
            :icon="data.item.id === copied ? 'check' : 'clone'"
            :disabled="copied===data.item.id"
            @click="copied=data.item.id"
          />
          <button-with-icon
            :pressed="data.detailsShowing"
            class="btn-only-icon btn-secondary btn-reverse"
            icon="cog"
            @click="data.toggleDetails"
          >
            {{ translate('dialog.buttons.settings') }}
          </button-with-icon>
          <button-with-icon
            class="btn-only-icon btn-danger btn-reverse"
            icon="trash"
            @click="del(data.item.id)"
          >
            {{ translate('dialog.buttons.delete') }}
          </button-with-icon>
        </template>
        <template #row-details="data">
          <component
            :is="data.item.value"
            v-if="haveAnyOptions(data.item.value)"
            :opts.sync="data.item.opts"
          />
          <div v-else>
            No settings for <em>{{ data.item.value || 'this' }} overlay</em>
          </div>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';
import {
  cloneDeep, isEqual, set,
} from 'lodash-es';
import { v4 as uuid } from 'uuid';

library.add(faChevronRight);

import type { OverlayMapperInterface, OverlayMapperOBSWebsocket } from 'src/bot/database/entity/overlay';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';

const socket = getSocket('/registries/overlays');

export default defineComponent({
  components: {
    'loading':       () => import('src/panel/components/loading.vue'),
    'clipscarousel': () => import('./components/clipscarousel.vue'),
    'obswebsocket':  () => import('./components/obswebsocket.vue'),
  },
  setup(props, ctx) {
    const items = ref([] as (OverlayMapperInterface | OverlayMapperOBSWebsocket)[]);
    const cacheItems = ref([] as (OverlayMapperInterface | OverlayMapperOBSWebsocket)[]);
    const copied = ref('');
    const options = [
      { value: null, text: 'Please select an option' },
      { value: 'alerts', text: 'alerts' },
      { value: 'bets', text: 'bets' },
      { value: 'carousel', text: 'carousel' },
      { value: 'clips', text: 'clips' },
      { value: 'clipscarousel', text: 'clipscarousel' },
      { value: 'credits', text: 'credits' },
      { value: 'emotes', text: 'emotes' },
      { value: 'emotescombo', text: 'emotescombo' },
      { value: 'eventlist', text: 'eventlist' },
      { value: 'obswebsocket', text: 'obswebsocket' },
      { value: 'polls', text: 'polls' },
      { value: 'randomizer', text: 'randomizer' },
      { value: 'stats', text: 'stats' },
      { value: 'tts', text: 'tts' },
    ];

    const fields = [
      { key: 'id' },
      { key: 'arrow' },
      { key: 'overlay' },
      { key: 'buttons', label: '' },
    ];

    const state = ref({ loading: ButtonStates.progress } as {
      loading: number;
    });

    onMounted(() => {
      refresh();
    });

    const haveAnyOptions = (type: string) => {
      const withOpts = ['obswebsocket', 'clipscarousel'];
      return withOpts.includes(type);
    };

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, data: Readonly<Required<OverlayMapperInterface>>[]) => {
        if(err) {
          return error(err);
        }
        items.value = cloneDeep(data);
        cacheItems.value = cloneDeep(data);
        state.value.loading = ButtonStates.success;
      });
    };

    watch(items, async (val) => {
      if (isEqual(cacheItems.value, val)) {
        console.log('skip');
        return;
      }

      const promised: any[] = [];
      for (const item of val) {
        if (item.value === 'obswebsocket' && item.opts === null) {
          set(item, 'opts.allowedIPs', []);
        } else if (!haveAnyOptions(item.value || '')) {
          item.opts = null;
        }
        promised.push(
          new Promise((resolve, reject) => {
            socket.emit('generic::setById', { id: item.id, item }, (err: string | null) => {
              if(err) {
                reject(err);
                return error(err);
              }
              resolve(true);
            });
          }),
        );
      }
      await Promise.all(promised);
    }, { deep: true });
    watch(copied, (val) => {
      if (val.length > 0) {
        navigator.clipboard.writeText(`${document.location.protocol}//${document.location.host}/overlays/${val}`);
        setTimeout(() => {
          copied.value = '';
          ctx.root.$emit('bv::hide::tooltip');
        }, 1000);
      }
    });

    const newItem = () => {
      items.value.push({
        id: uuid(), value: null, opts: null,
      });
    };

    const del = (id: string) => {
      if (confirm('Do you want to delete overlay ' + id + '?')) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        });
      }
    };

    return {
      items,
      state,
      options,
      copied,
      fields,

      haveAnyOptions,
      newItem,
      del,

      translate,
      ButtonStates,
    };
  },
});
</script>

<style>
.hide-header {
  border: 2px solid blue;
}
.hide-header thead {
  display: none;
}
</style>
