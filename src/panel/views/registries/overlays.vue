<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.overlays') }}
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" @click="newItem">{{translate('registry.overlays.newMapping')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading !== ButtonStates.success"/>
    <template v-else>
      <b-alert show v-if="items.length === 0">
        {{translate('registry.overlays.emptyMapping')}}
      </b-alert>
      <b-table :items="items" :fields="fields" bordered outlined class="hide-header w-auto m-auto table-light">
        <template v-slot:cell(id)="data">
          <pre class="m-0" style="display: inline-block; padding: 0.5rem 0 0 0;">{{data.item.id}}</pre>
        </template>
        <template v-slot:cell(arrow)>
          <div style="display: inline-block; padding: 0.375rem 0.4rem;"><fa icon="chevron-right" fixed-width/></div>
        </template>
        <template v-slot:cell(overlay)="data">
          <b-form-select v-model="data.item.value" :options="options"></b-form-select>
        </template>
        <template v-slot:cell(buttons)="data">
          <button-with-icon
            :text="'/overlays/' + data.item.id"
            :href="'/overlays/' + data.item.id"
            class="btn-dark btn-only-icon"
            icon="link"
            target="_blank"
            />
          <button-with-icon v-b-tooltip.focus="'Copied!'" class="btn-only-icon btn-primary btn-reverse" :icon="data.item.id === copied ? 'check' : 'clone'" :disabled="copied===data.item.id" @click="copied=data.item.id"/>
          <button-with-icon :pressed="data.detailsShowing" @click="data.toggleDetails" class="btn-only-icon btn-secondary btn-reverse" icon="cog">
            {{ translate('dialog.buttons.settings') }}
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(data.item.id)">
            {{ translate('dialog.buttons.delete') }}
          </button-with-icon>
        </template>
        <template v-slot:row-details="data">
          <template v-if="haveAnyOptions(data.item.value)">
            <template v-if="data.item.value === 'obswebsocket'">
              <b-form-group
                :label="translate('registry.overlays.allowedIPs.name')"
                :description="translate('registry.alerts.allowedIPs.help')"
              >
                <b-textarea v-bind:value="data.item.opts.allowedIPs.join('\n')" @input="data.item.opts.allowedIPs = $event.split('\n')" rows="5"></b-textarea>
              </b-form-group>
              <b-button @click="addCurrentIP(data.item.opts.allowedIPs)">Add current IP</b-button>
            </template>
          </template>
          <div v-else>
            No settings for <em>{{data.item.value || 'this'}} overlay</em>
          </div>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, } from '@vue/composition-api'
import { v4 as uuid } from 'uuid';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
library.add(faChevronRight)

import { getSocket } from 'src/panel/helpers/socket';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import translate from 'src/panel/helpers/translate';
import { getCurrentIP } from 'src/panel/helpers/getCurrentIP';
import type { OverlayMapperInterface, OverlayMapperOBSWebsocket } from 'src/bot/database/entity/overlay';
import { set, isEqual, cloneDeep } from 'lodash-es';
const socket = getSocket('/registries/overlays');

export default defineComponent({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
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

    const state = ref({
      loading: ButtonStates.progress,
    } as {
      loading: number;
    });

    onMounted(() => {
      refresh();
    });

    const haveAnyOptions = (type: string) => {
      const withOpts = ['obswebsocket'];
      return withOpts.includes(type);
    }

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, data: Readonly<Required<OverlayMapperInterface>>[]) => {
        if(err) {
          return error(err);
        }
        items.value = cloneDeep(data);
        cacheItems.value = cloneDeep(data);
        state.value.loading = ButtonStates.success;
      })
    };

    watch(items, async (val) => {
      if (isEqual(cacheItems.value, val)) {
        console.log('skip')
        return;
      }

      const promised: any[] = []
      for (const item of val) {
        if (item.value === 'obswebsocket' && item.opts === null) {
          set(item, 'opts.allowedIPs', [])
        } else if (!haveAnyOptions(item.value || '')) {
          item.opts = null
        }
        promised.push(
          new Promise((resolve, reject) => {
            socket.emit('generic::setById', { id: item.id, item }, (err: string | null) => {
              if(err) {
                reject(err);
                return error(err);
              }
              resolve(true)
            })
          })
        )
      };
      await Promise.all(promised);
    }, { deep: true })
    watch(copied, (val) => {
      if (val.length > 0) {
        navigator.clipboard.writeText(`https://${document.location.host}/overlays/${val}`);
        setTimeout(() => {
          copied.value = '';
          ctx.root.$emit('bv::hide::tooltip')
        }, 1000);
      }
    })

    const addCurrentIP = (array: string[]) => {
      getCurrentIP().then(value => {
        if (array[array.length - 1] === '') {
          array[array.length - 1] = value;
        } else {
          array.push(value);
        }
      });
    };

    const newItem = () => {
      items.value.push({ id: uuid(), value: null, opts: null })
    }

    const del = (id: string) => {
      if (confirm('Do you want to delete overlay ' + id + '?')) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        })
      }
    }

    return {
      items,
      state,
      options,
      copied,
      fields,

      addCurrentIP,
      haveAnyOptions,
      newItem,
      del,

      translate,
      ButtonStates,
    }
  }
})
</script>

<style>
.hide-header {
  border: 2px solid blue;
}
.hide-header thead {
  display: none;
}
</style>
