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

    <panel cards search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/keywords/edit">{{translate('systems.keywords.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <div class="alert alert-danger" v-else-if="state.loading === 2 && fItems.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.keywords.emptyAfterSearch').replace('$search', search)"/>
    </div>
    <div class="alert alert-info" v-else-if="state.loading === 2 && items.length === 0">
      {{translate('systems.keywords.empty')}}
    </div>
    <div v-else>
      {{ items }}
    </div>
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
    loading: ButtonStates;
  } = {
    loading: ButtonStates.progress,
  }

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
    this.socket.emit('find', {}, (err, data: KeywordInterface[]) => {
      if (err) return console.error(err);
      this.items = data;
      this.state.loading = ButtonStates.success;
    })
  }
}
</script>

<style scoped>
</style>
