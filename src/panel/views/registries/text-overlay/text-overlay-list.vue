<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.textoverlay') }}
        </span>
      </b-col>
    </b-row>

    <panel cards search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/registry/textoverlay/edit">{{translate('dialog.title.add')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="!state.loaded /* State.DONE */" />
    <div v-else-if="filtered.length > 0" class="card" v-for="(item, index) of filtered" v-bind:class="{ 'mt-3': index !== 0 }" v-bind:key="String(item.id)">
      <div class="card-body row">
        <div class="col-sm-5">
          <div style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px;">{{translate('name')}}</div>
          <div class="font-weight-bold  text-primary" style="font-size: 1.5rem">{{ item.name }}</div>

        </div>

        <div class="text-muted col-sm-1 text-center" style="margin-top: auto; margin-bottom: auto;font-size: 1.5rem">
          <fa class="ml-3 mr-3" :icon="['fab', 'html5']"></fa>
        </div>

        <div style="word-break: break-all; " class="col-sm-6">
          <div style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px;">
            <button class="btn btn-sm border-0" :class="[item.show === 'html' ? 'btn-dark' : 'btn-outline-dark' ]" @click="item.show = 'html';$forceUpdate()">HTML</button>
            <button class="btn btn-sm border-0" :class="[item.show === 'js' ? 'btn-dark' : 'btn-outline-dark' ]" @click="item.show = 'js';$forceUpdate()">JS</button>
            <button class="btn btn-sm border-0" :class="[item.show === 'css' ? 'btn-dark' : 'btn-outline-dark' ]" @click="item.show = 'css';$forceUpdate()">CSS</button>
          </div>

          <div v-if="typeof item.text !== 'undefined' && item.text.length > 0 && item.show === 'html'">
            <prism language="html" style="font-size:12px;">{{ showMore.includes(item.id) ? item.text : less(item.text, 'html') }}</prism>
          </div>

          <div v-if="typeof item.css !== 'undefined' && item.css.length > 0 && item.show === 'css'">
            <prism language="css" style="font-size:12px;">{{ showMore.includes(item.id) ? item.css : less(item.css, 'css') }}</prism>
          </div>

          <div v-if="typeof item.css !== 'undefined' && item.js.length > 0 && item.show === 'js'">
            <prism language="javascript" style="font-size:12px;">{{ showMore.includes(item.id) ? item.js : less(item.js, 'js') }}</prism>
          </div>
        </div>
      </div>

      <div class="card-body border-top p-0 text-right">
        <div class="btn-group" role="group">
          <button class="btn btn-outline-dark p-3 border-0" @click="toggleShowMore(item.id)">
            <fa class="mr-1" :icon="!showMore.includes(item.id) ? 'ellipsis-h' : 'ellipsis-v'"></fa> {{ !showMore.includes(item.id) ? translate('commons.show-more') : translate('commons.show-less') }}</button>
          <a v-bind:href="'/overlays/text?id='+ item.id" class="btn btn-outline-dark p-3 border-0" target="_blank"><fa icon="link"></fa> /overlays/text?id={{ item.id }}</a>
          <button @click="clone(item)" class="btn btn-outline-dark border-0">
            <fa icon="clone" fixed-width></fa></button>
          <button @click="goTo(item.id)" class="btn btn-outline-dark border-0">
            <fa icon="pencil-alt" fixed-width></fa></button>
          <hold-button class="btn-outline-dark border-0 btn-reverse p-1"
            @trigger="remove(item)">
            <template slot="title"><fa icon="trash" fixed-width/></template>
            <template slot="onHoldTitle"><fa icon="trash" fixed-width/></template>
          </hold-button>
        </div>
      </div>
    </div>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { isNil, orderBy } from 'lodash-es';
import Prism from 'vue-prism-component'
import { getSocket } from 'src/panel/helpers/socket';
import { v4 as uuid } from 'uuid';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faPencilAlt, faEllipsisH, faEllipsisV, faClone } from '@fortawesome/free-solid-svg-icons';
import { faHtml5 } from '@fortawesome/free-brands-svg-icons';
library.add(faPencilAlt, faHtml5, faEllipsisH, faEllipsisV, faClone);

import 'prismjs'
import 'prismjs/themes/prism.css'
import { TextInterface } from '../../../../bot/database/entity/text';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
    'prism': Prism,
  },
  filters: {
    capitalize(value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class textOverlayList extends Vue {
    search: string = '';
    state: { loaded: boolean; } = { loaded: false }
    showMore: string[] = [];
    items: any[] = [];
    socket = getSocket('/registries/text');

    get filtered() {
      if (this.search.length === 0) return this.items
      return this.items.filter((o) => {
        const isSearchInName = !isNil(o.name.match(new RegExp(this.search, 'ig')))
        const isSearchInText = !isNil(o.text.match(new RegExp(this.search, 'ig')))
        return isSearchInName || isSearchInText
      })
    }

    created() {
      this.state.loaded = false;
      this.refresh();
    }

    refresh() {
      this.socket.emit('generic::getAll', (err: string | null, items: TextInterface) => {
        if (err) {
          return console.error(err)
        }
        this.items = orderBy(items, 'name', 'asc')
        this.items.map(o => { o.show = 'html'; return o })
        this.state.loaded = true;
      })
    }

    less(value: string, type: 'js' | 'html' | 'css') {
      const comments = {
        'js': { start: '/*', end: '*/' },
        'css': { start: '/*', end: '*/' },
        'html': { start: '<!--', end: '-->' }
      }
      const lines = value.split(/\r?\n/g)
      value = lines.slice(0, 5).join('\n')

      if (lines.length - 5 > 0) {
        value += '\n\n' + comments[type].start + ' '  + (lines.length - 5) + ' lines hidden, click show more ' + comments[type].end
      }
      return value
    }

    toggleShowMore(_id: string) {
      let idx = this.showMore.indexOf(_id)
      if(idx !== -1) {
        this.showMore.splice(idx, 1)
      } else {
        this.showMore.push(_id)
      }
    }

    clone(item: TextInterface) {
      this.socket.emit('text::save', { ...item, id: uuid(), name: item.name + ' (clone)' }, (err: string | null, data: TextInterface) => {
        if (err) {
          console.error(err)
        }
        this.refresh();
      });
    }

    remove(item: TextInterface) {
      this.socket.emit('text::remove', item, () => {
        this.items = this.items.filter(o => o.id != item.id)
      })
    }

    goTo(id: string) {
      this.$router.push({ name: 'TextOverlayEdit', params: { id } })
    }
}
</script>
