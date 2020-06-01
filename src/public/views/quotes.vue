<template lang="pug">
  b-container(ref="quotes" style="min-height: calc(100vh - 49px);").fluid.pt-2
    b-row
      b-col
        span.title.text-default.mb-2 {{ translate('menu.quotes') }}

    panel
      template(v-slot:left)
        button-with-icon(icon="caret-left" href="#/").btn-secondary.btn-reverse {{translate('commons.back')}}

    loading(v-if="state.loading !== $state.success")
    b-table(v-else striped small :items="items" :fields="fields").table-p-0
      template(v-slot:cell(createdAt)="data") {{ data.item.createdAt | moment('LL')}} {{ data.item.createdAt | moment('LTS') }}
      template(v-slot:cell(quote)="data")
        span(style="word-break: break-word;") {{ data.item.quote }}
      template(v-slot:cell(tags)="data")
        span(v-for="tag of data.item.tags" v-bind:key="tag" variant="dark").p-2.m-1.text-light.bg-dark {{ tag }}
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import VueScrollTo from 'vue-scrollto';

import { getSocket } from 'src/panel/helpers/socket';
import { QuotesInterface } from '../../bot/database/entity/quotes';

@Component({
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  }
})
export default class playlist extends Vue {
  socket = getSocket('/systems/quotes', true);

  items: any[] = []

  state: {
    loading: number;
   } = {
    loading: this.$state.progress
  };

  fields = [
    { key: 'createdAt', label: this.translate('systems.quotes.date.name'), sortable: true },
    { key: 'quote', label: this.translate('systems.quotes.quote.name'), sortable: true },
    { key: 'tags', label: this.translate('systems.quotes.tags.name') },
    { key: 'quotedByName', label: this.translate('systems.quotes.by.name'), sortable: true },
    // virtual attributes
    { key: 'buttons', label: '' },
  ]

  mounted() {
    this.state.loading = this.$state.progress;
    this.socket.emit('quotes:getAll', {}, (err: string | null, items: QuotesInterface[]) => {
      console.debug('Loaded', {items})
      this.items = items
      this.state.loading = this.$state.success;
    })
    this.$nextTick(() => {
      VueScrollTo.scrollTo(this.$refs.quotes as Element, 500, { container: 'body', force: true, cancelable: true, offset: -49 })
    })
  }
}
</script>