<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.highlights') }}
        </span>
      </b-col>
      <b-col
        v-if="!$systems.find(o => o.name === 'highlights').enabled"
        style=" text-align: right;"
      >
        <b-alert
          show
          variant="danger"
          style="padding: .5rem; margin: 0; display: inline-block;"
        >
          <fa
            icon="exclamation-circle"
            fixed-width
          /> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel
      search
      @search="search = $event"
    />

    <loading v-if="state.loading !== $state.success" />
    <b-table
      v-else
      striped
      small
      :items="filtered"
      :fields="fields"
      class="table-p-0"
    >
      <template #cell(thumbnail)="data">
        <img
          class="float-left pr-3"
          :src="generateThumbnail(data.item.game)"
        >
      </template>
      <template #cell(title)="data">
        {{ data.item.title }}
        <small class="d-block">
          <fa :icon="[ 'far', 'clock' ]" /> {{ timestampToString(data.item.timestamp) }}
          <fa
            class="ml-2"
            :icon="['far', 'calendar-alt']"
          /> {{ new Date(data.item.createdAt).toLocaleString() }}
          <fa
            class="ml-2"
            :icon="['fas', 'gamepad']"
          /> {{ data.item.game }}
        </small>
      </template>
      <template #cell(buttons)="data">
        <div
          class="float-right pr-2"
          style="width: max-content !important;"
        >
          <button-with-icon
            class="btn-only-icon btn-secondary btn-reverse"
            icon="link"
            :href="'https://www.twitch.tv/videos/' + data.item.videoId + '?t=' + timestampToString(data.item.timestamp)"
          />
          <hold-button
            icon="trash"
            class="btn-danger btn-reverse btn-only-icon"
            @trigger="deleteItem(data.item.id)"
          >
            <template slot="title">
              {{ translate('dialog.buttons.delete') }}
            </template>
            <template slot="onHoldTitle">
              {{ translate('dialog.buttons.hold-to-delete') }}
            </template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCalendarAlt } from '@fortawesome/free-regular-svg-icons';
import { faGamepad } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { isNil } from 'lodash-es';
import { Component, Vue } from 'vue-property-decorator';

import { HighlightInterface } from '../../../bot/database/entity/highlight';

library.add(faGamepad, faCalendarAlt);

@Component({ components: { loading: () => import('../../components/loading.vue') } })
export default class highlightsList extends Vue {
  translate = translate;
  socket = getSocket('/systems/highlights');
  items: HighlightInterface[] = [];
  search = '';

  fields = [
    {
      key: 'thumbnail', label: '', tdClass: 'fitThumbnail',
    },
    { key: 'title', label: '' },
    { key: 'buttons', label: '' },
  ];

  state: {
    loading: number;
  } = { loading: this.$state.progress };

  get filtered() {
    let items = this.items;
    if (this.search.length > 0) {
      items = this.items.filter((o) => {
        return !isNil(o.title.match(new RegExp(this.search, 'ig'))) || !isNil(o.game.match(new RegExp(this.search, 'ig')));
      });
    }
    return items.sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, items: HighlightInterface[]) => {
      this.items = items;
      this.state.loading = this.$state.success;
    });
  }

  timestampToString(value: { hours: number; minutes: number; seconds: number }) {
    const string = (value.hours ? `${value.hours}h` : '')
      + (value.minutes ? `${value.minutes}m` : '')
      + (value.seconds ? `${value.seconds}s` : '');
    return string;
  }

  generateThumbnail(game: string) {
    const template = 'https://static-cdn.jtvnw.net/ttv-boxart/./%{game}-60x80.jpg';
    return template.replace('%{game}', encodeURI(game));
  }

  deleteItem(id: string) {
    this.socket.emit('generic::deleteById', id, () => {
      this.items = this.items.filter((o) => o.id !== id);
    });
  }
}
</script>

<style>
.table-p-0 td {
  padding: 0 !important;
}
.fitThumbnail {
  width: 100px;
}
</style>
