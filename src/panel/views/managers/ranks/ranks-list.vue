<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.ranks') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'ranks').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/ranks/edit">{{translate('systems.ranks.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-alert show variant="danger" v-else-if="state.loading === $state.success && fItems.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.ranks.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loading === $state.success && items.length === 0">
      {{translate('systems.ranks.empty')}}
    </b-alert>
    <b-table v-else striped small hover :items="fItems" :fields="fields" @row-clicked="linkTo($event)">
      <template v-slot:cell(hours)="data">
        <span class="font-weight-bold text-primary font-bigger">{{ data.item.hours }}</span>
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="float-right" style="width: max-content !important;">
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/ranks/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="remove(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from 'src/panel/helpers/socket';
import { capitalize } from 'src/panel/helpers/capitalize';

import { Vue, Component/*, Watch */ } from 'vue-property-decorator';
import { isNil } from 'lodash-es';
import { escape } from 'xregexp';
import { Rank } from 'src/bot/database/entity/rank';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
})
export default class ranksList extends Vue {
  socket = getSocket('/systems/ranks');

  items: Rank[] = [];
  search: string = '';
  state: {
    loading: number;
  } = {
    loading: this.$state.progress,
  }

  fields = [
    { key: 'hours', label: capitalize(this.translate('hours')), sortable: true },
    { key: 'rank', label: this.translate('rank'), sortable: true },
    { key: 'buttons', label: '' },
  ];

  get fItems() {
    if (this.search.length === 0) return this.items
    return this.items.filter((o) => {
      const isSearchInHours = !isNil(String(o.hours).match(new RegExp(escape(this.search), 'ig')))
      const isSearchInValue = !isNil(o.rank.match(new RegExp(escape(this.search), 'ig')))
      return isSearchInHours || isSearchInValue
    })
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('ranks::getAll', (items) => {
      console.debug('Loaded', items)
      this.items = items;
      this.state.loading = this.$state.success;
    })
  }

  linkTo(item) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'ranksManagerEdit', params: { id: item.id } });
  }

  remove(id) {
   this.socket.emit('ranks::remove', id, () => {
      this.items = this.items.filter((o) => o.id !== id);
    })
  }

  update(item) {
    this.socket.emit('ranks::save', item, () => {});
  }
}
</script>