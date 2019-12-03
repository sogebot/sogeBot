<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.randomizer') }}
        </span>
      </div>
    </div>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/registry/randomizer/edit">{{translate('registry.randomizer.addRandomizer')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="!state.loaded /* State.DONE */" />
    <b-table v-else :fields="fields" :items="filteredVariables">
    </b-table>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import { Randomizer } from 'src/bot/database/entity/randomizer';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
library.add(faExclamationTriangle)

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
})
export default class randomizerList extends Vue {
  psocket: SocketIOClient.Socket = getSocket('/core/permissions');
  socket: SocketIOClient.Socket =  getSocket('/registry/randomizer');

  fields = [
    { key: 'command', label: 'command', sortable: true },
    { key: 'permissionId', label: 'permissionId', sortable: true },
    { key: 'name', label: 'name', sortable: true },
    { key: 'type', label: 'type', sortable: true },
    // virtual attributes
    { key: 'additional-info', label: this.translate('registry.customvariables.additional-info') },
    { key: 'buttons', label: '' },
  ];

  items: Randomizer[] = [];
  permissions: {id: string; name: string;}[] = [];
  search: string = '';

  state: { loaded: boolean; } = { loaded: false }

  get filteredItems() {
    return this.items;
  }

  mounted() {
    this.state.loaded = false;
    this.socket.emit('randomizer::getAll', (err, data) => {
      this.items = data;
      this.state.loaded = true;
    })
  }

  getPermissionName(id) {
    if (!id) return null
    const permission = this.permissions.find((o) => {
      return o.id === id
    })
    if (typeof permission !== 'undefined') {
      if (permission.name.trim() === '') {
        return permission.id
      } else {
        return permission.name
      }
    } else {
      return null
    }
  }
}
</script>