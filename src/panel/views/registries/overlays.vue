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
      <div v-for="(item, index) in items" v-bind:key="item.id">
        <b-list-group horizontal style="margin: auto; width: fit-content;">
          <b-list-group-item :class="{'border-bottom-0': index !== items.length - 1}">
            <pre class="m-0" style="display: inline-block; padding: 0.5rem 0 0 0;">{{item.id}}</pre>
          </b-list-group-item>
          <b-list-group-item :class="{'border-bottom-0': index !== items.length - 1}">
            <div style="display: inline-block; padding: 0.375rem 0.4rem;"><fa icon="chevron-right" fixed-width/></div>
          </b-list-group-item>
          <b-list-group-item :class="{'border-bottom-0': index !== items.length - 1}">
            <b-form-select v-model="item.value" :options="options"></b-form-select>
          </b-list-group-item>
          <b-list-group-item :class="{'border-bottom-0': index !== items.length - 1}">
            <button-with-icon
              :text="'/overlays/' + item.id"
              :href="'/overlays/' + item.id"
              class="btn-dark btn-only-icon"
              icon="link"
              target="_blank"
              />
            <button-with-icon  v-b-tooltip.focus="'Copied!'" class="btn-only-icon btn-primary btn-reverse" :icon="item.id === copied ? 'check' : 'clone'" :disabled="copied===item.id" @click="copied=item.id"/>
            <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(item.id)">
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </b-list-group-item>
        </b-list-group>
      </div>
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
import type { OverlayMapperInterface } from 'src/bot/database/entity/overlay';
const socket = getSocket('/registries/overlays');

export default defineComponent({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  },
  setup(props, ctx) {
    const items = ref([] as OverlayMapperInterface[]);
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
      { value: 'eventlist', text: 'eventlist' },
      { value: 'polls', text: 'polls' },
      { value: 'randomizer', text: 'randomizer' },
      { value: 'stats', text: 'stats' },
      { value: 'tts', text: 'tts' },
    ];

    const state = ref({
      loading: ButtonStates.progress,
    } as {
      loading: number;
    });

    onMounted(() => {
      refresh();
    });

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, data: Readonly<Required<OverlayMapperInterface>>[]) => {
        if(err) {
          return error(err);
        }
        items.value = data;
        state.value.loading = ButtonStates.success;
      })
    };

    watch(items, (val) => {
      for (const item of val) {
        socket.emit('generic::setById', { id: item.id, item }, (err: string | null) => {
          if(err) {
            return error(err);
          }
        })
      }
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

    const newItem = () => {
      items.value.push({ id: uuid(), value: null })
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

      newItem,
      del,

      translate,
      ButtonStates,
    }
  }
})
</script>

<style>
.alias-table-btn button {
  padding: 6px !important;
}
</style>
