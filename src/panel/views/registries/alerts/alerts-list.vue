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
    <b-table v-else :fields="fields" :items="filtered">
      <template slot="description" slot-scope="data">
        <small v-bind:class="{ 'text-muted': !data.value || data.value.length === 0 }">
          {{ data.value && data.value.length !== 0 ? data.value : translate('not-available') }}
        </small>
      </template>
      <template slot="type" slot-scope="data">
        <div style="font-size: 1.2rem;">
          {{ translate('registry.customvariables.types.' + data.value) }}
        </div>
      </template>
      <template slot="currentValue" slot-scope="data">
        <small v-bind:class="{ 'text-muted': !data.value || data.value.length === 0 }">
          {{ data.value && data.value.length !== 0 ? data.value : translate('not-available') }}
        </small>
      </template>
      <template slot="additional-info" slot-scope="data">
        <span v-if="data.item.type === 'eval'">
          <strong>{{ translate('registry.customvariables.run-script') }}:</strong>
          <template v-if="data.item.runEveryTypeValue > 0">
            {{ data.item.runEvery / data.item.runEveryTypeValue }} {{ translate('registry.customvariables.runEvery.' + data.item.runEveryType) }}
          </template>
          <template v-else>
            {{ translate('registry.customvariables.runEvery.' + data.item.runEveryType) }}
          </template>
          <div>
            {{ translate('registry.customvariables.last-run') }} <strong>{{ data.item.runAt ? new Date(data.item.runAt).toLocaleString() : translate('commons.never') }}</strong>
          </div>
        </span>
        <span v-if="data.item.type === 'options'">
          <strong>{{ translate('registry.customvariables.usableOptions.name') }}:</strong>
          {{ data.item.usableOptions }}
        </span>
        <div v-if="data.item.readOnly">
          <strong>{{ translate('registry.customvariables.isReadOnly') | capitalize }}</strong>
        </div>

        <div>
          <strong>{{ translate('registry.customvariables.response.name') }}:</strong>
          <span v-if="data.item.responseType === 0">{{ translate('registry.customvariables.response.default') }}</span>
          <span v-if="data.item.responseType === 1">{{ translate('registry.customvariables.response.custom') }}</span>
          <span v-if="data.item.responseType === 2">{{ translate('registry.customvariables.response.command') }}</span>
          <i v-if="data.item.responseType === 1">{{ data.item.responseText }}</i>
        </div>
        <div>
          <strong> {{ translate('registry.customvariables.permissionToChange') }}:</strong>
          <span v-if="getPermissionName(data.item.permission)">{{ getPermissionName(data.item.permission) }}</span>
          <span v-else class="text-danger"><i class="fas fa-exclamation-triangle"></i> Permission not found</span>
        </div>
      </template>
      <template slot="buttons" slot-scope="data">
        <a v-bind:href="'#/registry/customVariables/edit/' + data.item._id" class="btn btn-primary btn-block"><fa icon="edit"/> {{ translate('dialog.buttons.edit') }}</a>
        <button v-if="data.item.type === 'eval'" v-on:click="debouncedRunScript(data.item._id)" class="btn btn-secondary btn-block"><fa icon="cog"/> {{ translate('registry.customvariables.run-script') }}</button>
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
  socket: SocketIOClient.Socket =  io('/registry/alerts', { query: "token=" + this.token });

  fields = [
    { key: 'variableName', label: '$_', sortable: true },
    { key: 'description', label: this.translate('registry.customvariables.description.name') },
    { key: 'type', sortable: true, label: this.translate('registry.customvariables.type.name') },
    { key: 'currentValue', label: this.translate('registry.customvariables.currentValue.name') },
    // virtual attributes
    { key: 'additional-info', label: this.translate('registry.customvariables.additional-info') },
    { key: 'buttons', label: '' },
  ];

  items: any[] = [];

  state: { loaded: number; } = { loaded: this.$state.progress }

  get filtered() {
    return this.items;
  }

  mounted() {
    this.state.loaded = this.$state.progress;
  }
}
</script>