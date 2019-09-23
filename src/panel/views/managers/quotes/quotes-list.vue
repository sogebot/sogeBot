<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col cols="12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.quotes') }}
          <template v-if="search.length > 0">
            <small>
              <fa icon="search"/>
            </small>
            {{ search }}
          </template>
        </span>
        <div class="text-right" style="float:right" v-if="quotesFromDb.length > 0">
          <strong>{{ translate('systems.quotes.tag-filter') }}</strong>
          <span class="border-0 bg-light widget p-1" style="height: auto; line-height: 3rem; word-break: break-all;">
            <span v-for="tag of tags"
                  v-bind:key="tag"
                  v-on:click="toggleTags(tag)"
                  v-bind:class="[ filteredTags.includes(tag) ? 'bg-success' : 'bg-dark' ]"
                  class="p-2 m-1 text-light"
                  style="cursor: pointer;">{{ tag }}</span>
          </span>
        </div>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/quotes/edit">{{translate('systems.quotes.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === $state.progress || state.settings === $state.progress" />
    <b-alert show variant="danger" v-else-if="state.loading === $state.success && state.settings === $state.success && quotes.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.quotes.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loading === $state.success && state.settings === $state.success && quotes.length === 0">
      {{translate('systems.quotes.empty')}}
    </b-alert>
    <b-table v-else :fields="fields" :items="quotes" hover small style="cursor: pointer;" @row-clicked="linkTo($event)">
      <template v-slot:cell(createdAt)="data">
        {{ data.item.createdAt | moment('LL')}} {{ data.item.createdAt | moment('LTS') }}
      </template>

      <template v-slot:cell(tags)="data">
        <span class="p-2 m-1 text-light bg-dark" v-for="tag of data.item.tags" v-bind:key="tag" variant="dark">{{ tag }}</span>
      </template>

      <template v-slot:cell(buttons)="data">
        <div class="text-right">
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/quotes/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="deleteQuote(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { QuoteInterface } from '../../../../bot/systems/quotes';
import _ from 'lodash';

import { getUsernameById } from '../../../helpers/userById';


@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize(value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class quotesList extends Vue {
  quotesFromDb: QuoteInterface[] = [];
  filteredTags: string[] = [];
  changed: string[] = [];
  isDataChanged = false;
  settings: any = {};

  search: string = '';

  fields = [
    { key: 'createdAt', label: this.translate('systems.quotes.date.name'), sortable: true },
    { key: 'quote', label: this.translate('systems.quotes.quote.name'), sortable: true },
    { key: 'tags', label: this.translate('systems.quotes.tags.name') },
    { key: 'quotedBy', label: this.translate('systems.quotes.by.name'), sortable: true },
    // virtual attributes
    { key: 'buttons', label: '' },
  ]

  state: {
    settings: number,
    loading: number,
  } = {
    settings: this.$state.progress,
    loading: this.$state.progress,
  }

  socket = io('/systems/quotes', { query: "token=" + this.token });

  created() {
    this.socket.emit('find', {}, async (err, items: QuoteInterface[]) => {
      for(const item of items) {
        item.quotedBy = await getUsernameById(item.quotedBy);
      }
      this.quotesFromDb = items
      this.state.loading = this.$state.success;
    })
    this.socket.emit('settings', (err, data) => {
      this.settings = data;
      this.state.settings = this.$state.success;
    })
  };

  get quotes() {
    let quotesFilteredBySearch: QuoteInterface[] = []
    if (this.search.trim().length > 0) {
      for (let quote of this.quotesFromDb) {
        if (quote.quote.toLowerCase().includes(this.search)) {
          quotesFilteredBySearch.push(quote);
        }
      }
     } else {
       quotesFilteredBySearch = this.quotesFromDb;
     }

    if (this.filteredTags.length === 0) return quotesFilteredBySearch
    else {
      let quotesFilteredByTags: QuoteInterface[] = []
      for (let quote of quotesFilteredBySearch) {
        for (let tag of quote.tags) {
          if (this.filteredTags.includes(tag)) {
            quotesFilteredByTags.push(quote);
            break
          }
        }
      }
      return quotesFilteredByTags
    }
  }
  get tags() {
    let tags: string[][] = []
    for (let quote of this.quotesFromDb) tags.push(quote.tags)
    return _(tags).flatten().uniq().orderBy().value()
  }

  toggleTags(tag) {
    this.filteredTags = _.xor(this.filteredTags, [tag])
  }

  deleteQuote(id) {
    this.quotesFromDb = this.quotes.filter((o) => o.id !== id)
    this.socket.emit('delete', {id})
  }

  linkTo(item) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'QuotesManagerEdit', params: { id: item.id } });
  }
}
</script>
