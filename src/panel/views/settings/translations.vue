<template>
  <b-container
    ref="window"
    fluid
  >
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.settings') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.translations') }}
        </span>
      </b-col>
    </b-row>

    <panel
      search
      @search="search = $event"
    >
      <template #right>
        <b-pagination
          v-model="currentPage"
          class="m-0"
          :total-rows="rows"
          :per-page="perPage"
          aria-controls="my-table"
        />
      </template>
    </panel>

    <loading v-if="state.loading === $state.progress || state.settings === $state.progress" />
    <b-table
      v-else
      show-empty
      striped
      :fields="fields"
      :items="fItems"
      small
      style="cursor: pointer;"
      :per-page="perPage"
      :current-page="currentPage"
    >
      <template #empty>
        <b-alert
          show
          class="m-0"
        >
          {{ translate('dialog.nothingToShow') }}
        </b-alert>
      </template>
      <template #cell(current)="data">
        <b-form>
          <b-form-group style="margin:0 !important">
            <b-input-group>
              <b-form-input
                :id="data.item.name"
                v-model="data.item.current"
                type="text"
                @input="updateTranslation(data.item.name, data.item.current, data.item.default)"
              />
              <b-input-group-append v-if="data.item.current !== data.item.default">
                <b-button
                  variant="primary"
                  @click="data.item.current = data.item.default; revertTranslation(data.item.name)"
                >
                  Revert
                </b-button>
              </b-input-group-append>
            </b-input-group>
          </b-form-group>
        </b-form>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { isNil } from 'lodash-es';
import {
  Component, Vue, Watch,
} from 'vue-property-decorator';

@Component({ components: { 'loading': () => import('../../components/loading.vue') } })
export default class translations extends Vue {
  translate = translate;
  items: { name: string, current: string, default: string }[] = [];
  search = '';

  currentPage = 1;
  perPage = 10;

  fields = [
    {
      key:      'name',
      label:    translate('integrations.responsivevoice.settings.key.title'),
      sortable: true,
      thStyle:  'width: 375px',
    },
    { key: 'current', label: translate('core.permissions.value') },
  ];

  state: {
    loading: number,
  } = { loading: this.$state.progress };

  socket = getSocket('/');

  @Watch('search')
  watchSearch() {
    this.currentPage = 1;
  }

  get rows() {
    return this.fItems.length;
  }

  revertTranslation(name: string) {
    this.socket.emit('responses.revert', { name }, (orig: string) => {
      console.log('Reverted', name, orig);
    });
  }

  updateTranslation(name: string, value: string, defaultValue: string) {
    if (value === defaultValue) {
      this.revertTranslation(name);
    } else {
      this.socket.emit('responses.set', { name, value });
    }
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('responses.get', null, (data: { default: string; current: string }) => {
      console.groupCollapsed('translations::responses.get');
      console.log(data);
      console.groupEnd();
      this.items = Object
        .entries(data)
        .map(o => {
          if ((o[1] as any).current.startsWith('{missing')) {
            console.debug(`${o[0]} have missing translation`);
          }
          return {
            name:    o[0] as string,
            current: (o[1] as any).current as string,
            default: (o[1] as any).default as string,
          };
        })
        .filter(o => !o.name.startsWith('webpanel') && !o.name.startsWith('ui'))
        .sort((a, b) => {
          const keyA = a.name.toUpperCase(); // ignore upper and lowercase
          const keyB = b.name.toUpperCase(); // ignore upper and lowercase
          if (keyA < keyB) {
            return -1;
          }
          if (keyA > keyB) {
            return 1;
          }

          // names must be equal
          return 0;
        });
      this.state.loading = this.$state.success;
    });
  }

  get fItems() {
    if (this.search.length === 0) {
      return this.items;
    }
    return this.items.filter((o) => {
      const isSearchInKey = !isNil(o.name.match(new RegExp(this.search, 'ig')));
      return isSearchInKey;
    });
  }
}
</script>
