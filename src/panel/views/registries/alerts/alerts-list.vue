<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.alerts') }}
        </span>
      </div>
    </div>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/registry/alerts/edit">{{translate('dialog.title.add')}}</button-with-icon>
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
      <template slot="additional-info" slot-scope="data">
        <span :class="{'text-primary': data.item.alerts.follows.length > 0, 'text-muted': data.item.alerts.follows.length === 0}">
          FOLLOW<span v-if="data.item.alerts.follows.length > 0">({{data.item.alerts.follows.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.alerts.hosts.length > 0, 'text-muted': data.item.alerts.hosts.length === 0}">
          HOSTS<span v-if="data.item.alerts.hosts.length > 0">({{data.item.alerts.hosts.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.alerts.raids.length > 0, 'text-muted': data.item.alerts.raids.length === 0}">
          RAID<span v-if="data.item.alerts.raids.length > 0">({{data.item.alerts.raids.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.alerts.cheers.length > 0, 'text-muted': data.item.alerts.cheers.length === 0}">
          CHEERS<span v-if="data.item.alerts.cheers.length > 0">({{data.item.alerts.cheers.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.alerts.subs.length > 0, 'text-muted': data.item.alerts.subs.length === 0}">
          SUBS<span v-if="data.item.alerts.subs.length > 0">({{data.item.alerts.subs.length}})</span>
        </span>
        <span :class="{'text-primary': data.item.alerts.tips.length > 0, 'text-muted': data.item.alerts.tips.length === 0}">
          TIPS<span v-if="data.item.alerts.tips.length > 0">({{data.item.alerts.tips.length}})</span>
        </span>
      </template>
      <template slot="buttons" slot-scope="data">
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
          <hold-button @trigger="del(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
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

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class customVariablesList extends Vue {
  socket: SocketIOClient.Socket =  io('/registries/alerts', { query: "token=" + this.token });

  fields = [
    { key: 'name', label: this.translate('registry.alerts.name.name'), sortable: true },
    // virtual attributes
    { key: 'additional-info', label: this.translate('registry.customvariables.additional-info') },
    { key: 'buttons', label: '' },
  ];

  items: Registry.Alerts.Alert[] = [];
  search: string = '';

  state: { loaded: number; } = { loaded: this.$state.progress }

  get filtered(): Registry.Alerts.Alert[] {
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

  linkTo(item) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'alertsEdit', params: { id: item.id } });
  }

  del(id) {
    this.socket.emit('delete', { where: { id }}, (err, deleted) => {
      if (err) {
        return console.error(err);
      }
      this.refresh();
    })
  }

  refresh() {
    this.state.loaded = this.$state.progress;
    this.socket.emit('find', {}, (err, data: Registry.Alerts.Alert[]) => {
      if (err) return console.error(err);
      this.items = data;
      this.state.loaded = this.$state.success;
    })
  }

  mounted() {
    this.refresh();
  }
}
</script>