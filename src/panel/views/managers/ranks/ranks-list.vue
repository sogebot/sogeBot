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
    <template v-else>
      <b-row>
        <b-col md="4" sm="12">
          <span class="title"><small>Watch time</small></span>
          <b-table striped small hover :items="fViewerItems" :fields="fields" @row-clicked="linkTo($event)" show-empty>
            <template v-slot:empty>
              <b-alert show variant="danger" class="m-0" v-if="search.length > 0"><fa icon="search"/> <span v-html="translate('systems.ranks.emptyAfterSearch').replace('$search', search)"/></b-alert>
              <b-alert show class="m-0" v-else>{{translate('systems.ranks.empty')}}</b-alert>
            </template>
            <template v-slot:cell(value)="data">
              <span class="font-weight-bold text-primary font-bigger">{{ data.item.value }}</span>
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
        </b-col>
        <b-col md="4" sm="12">
          <span class="title"><small>Follow time</small></span>
          <b-table striped small hover :items="fFollowerItems" :fields="fields2" @row-clicked="linkTo($event)" show-empty>
            <template v-slot:empty>
              <b-alert show variant="danger" class="m-0" v-if="search.length > 0"><fa icon="search"/> <span v-html="translate('systems.ranks.emptyAfterSearch').replace('$search', search)"/></b-alert>
              <b-alert show class="m-0" v-else>{{translate('systems.ranks.empty')}}</b-alert>
            </template>
            <template v-slot:cell(value)="data">
              <span class="font-weight-bold text-primary font-bigger">{{ data.item.value }}</span>
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
        </b-col>
        <b-col md="4" sm="12">
          <span class="title"><small>Sub time</small></span>
          <b-table striped small hover :items="fSubscriberItems" :fields="fields2" @row-clicked="linkTo($event)" show-empty>
            <template v-slot:empty>
              <b-alert show variant="danger" class="m-0" v-if="search.length > 0"><fa icon="search"/> <span v-html="translate('systems.ranks.emptyAfterSearch').replace('$search', search)"/></b-alert>
              <b-alert show class="m-0" v-else>{{translate('systems.ranks.empty')}}</b-alert>
            </template>
            <template v-slot:cell(value)="data">
              <span class="font-weight-bold text-primary font-bigger">{{ data.item.value }}</span>
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
        </b-col>
      </b-row>
    </template>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from 'src/panel/helpers/socket';
import { capitalize } from 'src/panel/helpers/capitalize';

import { Vue, Component/*, Watch */ } from 'vue-property-decorator';
import { isNil } from 'lodash-es';
import { escape } from 'xregexp';
import { RankInterface } from 'src/bot/database/entity/rank';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
})
export default class ranksList extends Vue {
  socket = getSocket('/systems/ranks');

  items: RankInterface[] = [];
  search: string = '';
  state: {
    loading: number;
  } = {
    loading: this.$state.progress,
  }

  fields = [
    { key: 'value', label: capitalize(this.translate('hours')), sortable: true },
    { key: 'rank', label: this.translate('rank'), sortable: true },
    { key: 'buttons', label: '' },
  ];

  fields2 = [
    { key: 'value', label: capitalize(this.translate('months')), sortable: true },
    { key: 'rank', label: this.translate('rank'), sortable: true },
    { key: 'buttons', label: '' },
  ];

  get fViewerItems() {
    if (this.search.length === 0) {
      return this.items.filter((o) => o.type === 'viewer');
    }
    return this.items.filter((o) => {
      const isViewer = o.type === 'viewer';
      const isSearchInHours = !isNil(String(o.value).match(new RegExp(escape(this.search), 'ig')))
      const isSearchInValue = !isNil(o.rank.match(new RegExp(escape(this.search), 'ig')))
      return isViewer && (isSearchInHours || isSearchInValue);
    })
  }

  get fFollowerItems() {
    if (this.search.length === 0) {
      return this.items.filter((o) => o.type === 'follower');
    }
    return this.items.filter((o) => {
      const isFollower = o.type === 'follower';
      const isSearchInHours = !isNil(String(o.value).match(new RegExp(escape(this.search), 'ig')))
      const isSearchInValue = !isNil(o.rank.match(new RegExp(escape(this.search), 'ig')))
      return isFollower && (isSearchInHours || isSearchInValue);
    })
  }

  get fSubscriberItems() {
    if (this.search.length === 0) {
      return this.items.filter((o) => o.type === 'subscriber');
    }
    return this.items.filter((o) => {
      const isSubscriber = o.type === 'subscriber';
      const isSearchInHours = !isNil(String(o.value).match(new RegExp(escape(this.search), 'ig')))
      const isSearchInValue = !isNil(o.rank.match(new RegExp(escape(this.search), 'ig')))
      return isSubscriber && (isSearchInHours || isSearchInValue);
    })
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, items: RankInterface[]) => {
      if (err) {
        return console.error(err);
      }
      console.debug('Loaded', items)
      this.items = items;
      this.state.loading = this.$state.success;
    })
  }

  linkTo(item: Required<RankInterface>) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'ranksManagerEdit', params: { id: item.id } });
  }

  remove(id: string) {
   this.socket.emit('ranks::remove', id, () => {
      this.items = this.items.filter((o) => o.id !== id);
    })
  }

  update(item: RankInterface) {
    this.socket.emit('ranks::save', item, () => {});
  }
}
</script>