<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.price') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'price').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/price/edit">{{translate('systems.price.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <b-alert show variant="danger" v-else-if="state.loading === 2 && fItems.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.price.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loading === 2 && items.length === 0">
      {{translate('systems.price.empty')}}
    </b-alert>
    <b-table hover v-else striped small :items="fItems" :fields="fields" @row-clicked="linkTo($event)">
      <template v-slot:cell(buttons)="data">
        <div class="text-right">
          <button-with-icon :class="[ data.item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-only-icon btn-reverse" icon="power-off" @click="data.item.enabled = !data.item.enabled; update(data.item)">
            {{ translate('dialog.buttons.' + (data.item.enabled? 'enabled' : 'disabled')) }}
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/price/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="del(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component/*, Watch */ } from 'vue-property-decorator';
import { isNil } from 'lodash-es';
import { getSocket } from 'src/panel/helpers/socket';
import { PriceInterface } from '../../../../bot/database/entity/price';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
})
export default class priceList extends Vue {
  socket = getSocket('/systems/price');
  search: string = '';
  items: any[] = [];
  state: {
    loading: number;
  } = {
    loading: this.$state.progress,
  }

  fields = [
    { key: 'command', label: this.capitalize(this.translate('systems.price.command.name')), sortable: true },
    { key: 'price', label: this.capitalize(this.translate('systems.price.price.name')), sortable: true, tdClass: 'font-weight-bold text-primary font-bigger' },
    { key: 'buttons', label: '' },
  ];

  get fItems() {
    if (this.search.length === 0) return this.items
    return this.items.filter((o) => {
      const isSearchInPrice = !isNil(o.command.match(new RegExp(this.search, 'ig')))
      return isSearchInPrice
    })
  }

  capitalize(value: string) {
    if (!value) return ''
    value = value.toString()
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  created() {
    this.refresh();
  }

  refresh() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, items: PriceInterface[]) => {
      if (err) {
        return console.error(err);
      }
      this.items = items;
      console.debug({ items })
      this.state.loading = this.$state.success;
    })
  }

  update(item: PriceInterface) {
    this.socket.emit('price::save', item, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
    });
  }

  del(id: string) {
    this.socket.emit('generic::deleteById', id, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
      this.refresh();
    })
  }
  linkTo(item: Required<PriceInterface>) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'PriceManagerEdit', params: { id: item.id } });
  }
}
</script>
