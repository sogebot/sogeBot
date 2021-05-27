<template lang="pug">
  b-container(ref="quotesRef" style="min-height: calc(100vh - 49px);").fluid.pt-2
    b-row
      b-col
        span.title.text-default.mb-2 {{ translate('menu.quotes') }}

    panel
      template(v-slot:left)
        button-with-icon(icon="caret-left" href="#/").btn-secondary.btn-reverse {{translate('commons.back')}}

    loading(v-if="state.loading !== $state.success")
    b-table(v-else striped small :items="items" :fields="fields").table-p-0
      template(v-slot:cell(createdAt)="data") {{ dayjs(data.item.createdAt).format('LL')}} {{ dayjs(data.item.createdAt).format('LTS') }}
      template(v-slot:cell(quote)="data")
        span(style="word-break: break-word;") {{ data.item.quote }}
      template(v-slot:cell(tags)="data")
        span(v-for="tag of data.item.tags" v-bind:key="tag" variant="dark").p-2.m-1.text-light.bg-dark {{ tag }}
</template>

<script lang="ts">
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, ref,
} from '@vue/composition-api';
import VueScrollTo from 'vue-scrollto';

import { QuotesInterface } from 'src/bot/database/entity/quotes';
import { ButtonStates } from 'src/panel/helpers/buttonStates';

const socket = getSocket('/systems/quotes', true);
export default defineComponent({
  components: { loading: () => import('src/panel/components/loading.vue') },
  setup(props, ctx) {
    const items = ref([] as QuotesInterface[]);
    const quotesRef = ref(null as Element | null);

    const state = ref({ loading: ButtonStates.progress } as {
      loading: number;
    });

    const fields = [
      {
        key: 'createdAt', label: translate('systems.quotes.date.name'), sortable: true,
      },
      {
        key: 'quote', label: translate('systems.quotes.quote.name'), sortable: true,
      },
      { key: 'tags', label: translate('systems.quotes.tags.name') },
      {
        key: 'quotedByName', label: translate('systems.quotes.by.name'), sortable: true,
      },
      // virtual attributes
      { key: 'buttons', label: '' },
    ];

    const moveTo = () => {
      VueScrollTo.scrollTo(quotesRef.value as Element, 500, {
        container: 'body',
        force:     true,
        offset:    -49,
        onDone:    function() {
          const scrollPos = window.scrollY || document.getElementsByTagName('html')[0].scrollTop;
          if (scrollPos === 0) {
            setTimeout(() => moveTo(), 100);
          }
        },
      });
    };

    onMounted(() => {
      state.value.loading = ButtonStates.progress;
      socket.emit('quotes:getAll', {}, (err: string | null, itemsGetAll: QuotesInterface[]) => {
        console.debug('Loaded', { items });
        items.value = itemsGetAll;
        state.value.loading = ButtonStates.success;
      });
      ctx.root.$nextTick(() => {
        moveTo();
      });
    });

    return {
      dayjs,
      fields,
      items,
      state,
      translate,
      quotesRef,
    };
  },
});
</script>