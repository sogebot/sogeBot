<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.keywords') }}
          <template v-if="search.length > 0">
            <small>
              <fa icon="search"/>
            </small>
            {{ search }}
          </template>
        </span>
      </div>
    </div>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/keywords/edit">{{translate('systems.keywords.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <b-alert show variant="danger" v-else-if="state.loading === 2 && fItems.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.keywords.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loading === 2 && items.length === 0">
      {{translate('systems.keywords.empty')}}
    </b-alert>
    <b-table v-else striped small :items="fItems" :fields="fields">
      <div slot="buttons" slot-scope="data" class="text-right">
        <button-with-icon :class="[ data.item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-only-icon btn-reverse" icon="power-off" @click="data.item.enabled = !data.item.enabled; update(data.item)">
          {{ translate('dialog.buttons.' + (data.item.enabled? 'enabled' : 'disabled')) }}
        </button-with-icon>
        <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/keywords/edit/' + data.item.id">
          {{ translate('dialog.buttons.edit') }}
        </button-with-icon>
        <hold-button @trigger="del(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </div>
    </b-table>
  </div>
</template>

<script lang="ts">
import { Vue, Component/*, Watch */ } from 'vue-property-decorator';

import { KeywordInterface } from '../../../../bot/systems/keywords';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
})
export default class keywordsList extends Vue {
  socket = io('/systems/keywords', { query: "token=" + this.token });

  items: KeywordInterface[] = [];
  search: string = '';
  state: {
    loading: number;
  } = {
    loading: this.$state.progress,
  }

  fields = [
    { key: 'keyword', label: this.translate('systems.keywords.keyword.name'), sortable: true },
    { key: 'response', label: this.translate('systems.keywords.response.name'), sortable: true },
    { key: 'buttons', label: '' },
  ];


  get fItems(): KeywordInterface[] {
    let items = this.items
    if (this.search.trim() !== '') {
      items = this.items.filter((o) => {
        return o.keyword.trim().toLowerCase().includes(this.search.trim().toLowerCase())
      })
    }
    return items.sort((a, b) => {
      const A = a.keyword.toLowerCase();
      const B = b.keyword.toLowerCase();
      if (A < B)  { //sort string ascending
        return -1;
      }
      if (A > B) {
        return 1;
      }
      return 0; //default return value (no sorting)
      })
  }
  mounted() {
    this.refresh();
  }

  refresh() {
    this.state.loading = this.$state.progress;
    this.socket.emit('find', {}, (err, data: KeywordInterface[]) => {
      if (err) return console.error(err);
      this.items = data;
      this.state.loading = this.$state.success;
    })
  }

  del(id) {
    this.socket.emit('delete', { where: { id }}, (err, deleted) => {
      if (err) {
        return console.error(err);
      }
      this.refresh();
    })
  }

  update(keyword: KeywordInterface) {
    delete keyword._id;
    this.socket.emit('update', { key: 'id', items: [keyword] }, (err, data) => {
      if (err) {
        return console.error(err);
      }
    });
  }
}
</script>

<style scoped>
</style>
