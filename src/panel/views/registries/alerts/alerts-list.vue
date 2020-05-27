<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.alerts') }}
        </span>
      </div>
    </div>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/registry/alerts/edit">{{translate('dialog.title.add')}}</button-with-icon>
      </template>
      <template v-slot:right>
        <b-dropdown id="dropdown-buttons" :text="translate('registry.alerts.test')" class="m-2">
          <b-dropdown-item-button
            @click="socket.emit('test', event)"
            v-for="event of ['follows', 'cheers', 'tips', 'subs', 'resubs', 'subcommunitygifts', 'subgifts', 'hosts', 'raids']"
            v-bind:key="event">
            {{ translate('registry.alerts.event.' + event) }}</b-dropdown-item-button>
        </b-dropdown>
      </template>
    </panel>

    <loading v-if="state.loaded === $state.progress" />
    <b-alert show variant="danger" v-else-if="state.loaded === $state.success && filtered.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('registry.alerts.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loaded === $state.success && items.length === 0">
      {{translate('registry.alerts.empty')}}
    </b-alert>
    <b-table v-else :fields="fields" :items="filtered" hover small style="cursor: pointer;" @row-clicked="linkTo($event)">
      <template v-slot:cell(additional-info)="data">
        <span :class="{'text-primary': data.item.follows.length > 0, 'text-muted': data.item.follows.length === 0}">
          FOLLOW<span v-if="data.item.follows.length > 0">({{data.item.follows.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.hosts.length > 0, 'text-muted': data.item.hosts.length === 0}">
          HOSTS<span v-if="data.item.hosts.length > 0">({{data.item.hosts.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.raids.length > 0, 'text-muted': data.item.raids.length === 0}">
          RAID<span v-if="data.item.raids.length > 0">({{data.item.raids.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.cheers.length > 0, 'text-muted': data.item.cheers.length === 0}">
          CHEERS<span v-if="data.item.cheers.length > 0">({{data.item.cheers.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.subs.length > 0, 'text-muted': data.item.subs.length === 0}">
          SUBS<span v-if="data.item.subs.length > 0">({{data.item.subs.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.resubs.length > 0, 'text-muted': data.item.resubs.length === 0}">
          RESUBS<span v-if="data.item.resubs.length > 0">({{data.item.resubs.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.subgifts.length > 0, 'text-muted': data.item.subgifts.length === 0}">
          SUBGIFTS<span v-if="data.item.subgifts.length > 0">({{data.item.subgifts.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.subcommunitygifts.length > 0, 'text-muted': data.item.subcommunitygifts.length === 0}">
          SUBCOMMUNITYGIFTS<span v-if="data.item.subcommunitygifts.length > 0">({{data.item.subcommunitygifts.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.tips.length > 0, 'text-muted': data.item.tips.length === 0}">
          TIPS<span v-if="data.item.tips.length > 0">({{data.item.tips.length}})</span>
        </span>
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="text-right">
          <button-with-icon
            :text="'/overlays/alerts/' + data.item.id"
            :href="'/overlays/alerts/' + data.item.id"
            class="btn-dark btn-only-icon"
            icon="link"
            target="_blank"
            />
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/registry/alerts/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="del(data.item)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import type { AlertInterface } from 'src/bot/database/entity/alert';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize: function (value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class customVariablesList extends Vue {
  socket: SocketIOClient.Socket =  getSocket('/registries/alerts');

  fields = [
    { key: 'name', label: this.translate('registry.alerts.name.name'), sortable: true },
    // virtual attributes
    { key: 'additional-info', label: this.translate('registry.customvariables.additional-info') },
    { key: 'buttons', label: '' },
  ];

  items: AlertInterface[] = [];
  search: string = '';

  state: { loaded: number; } = { loaded: this.$state.progress }

  get filtered(): AlertInterface[] {
    let items = this.items
    if (this.search.trim() !== '') {
      items = this.items.filter((o) => {
        return o.name.trim().toLowerCase().includes(this.search.trim().toLowerCase())
      })
    }
    return items.sort((a, b) => {
      const A = a.name.toLowerCase();
      const B = b.name.toLowerCase();
      if (A < B)  { //sort string ascending
        return -1;
      }
      if (A > B) {
        return 1;
      }
      return 0; //default return value (no sorting)
      })
  }

  linkTo(item: Required<AlertInterface>) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'alertsEdit', params: { id: item.id } });
  }

  del(item: AlertInterface) {
    this.socket.emit('alerts::delete', item, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
      this.refresh();
    })
  }

  refresh() {
    this.state.loaded = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, data: AlertInterface[]) => {
      if (err) {
        return console.error(err);
      }
      console.debug('Loaded', data)
      this.items = data;
      this.state.loaded = this.$state.success;
    })
  }

  mounted() {
    this.refresh();
  }
}
</script>