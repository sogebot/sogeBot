<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.timers') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'timers').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/timers/edit">{{translate('systems.timers.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === $state.progress" />
    <b-alert show variant="danger" v-else-if="state.loading === $state.success && filtered.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.timers.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loading === $state.success && items.length === 0">
      {{translate('systems.timers.empty')}}
    </b-alert>
    <b-table v-else :fields="fields" :items="filtered" hover small style="cursor: pointer;" @row-clicked="linkTo($event)">
      <template v-slot:cell(responses)="data">
        <div><span class="font-weight-bold text-primary font-bigger">{{ data.item.messages.length }}</span></div>
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="text-right">
          <button-with-icon :class="[ data.item.isEnabled ? 'btn-success' : 'btn-danger' ]" class="btn-only-icon btn-reverse" icon="power-off" @click="data.item.isEnabled = !data.item.isEnabled; update(data.item)">
            {{ translate('dialog.buttons.' + (data.item.isEnabled? 'enabled' : 'disabled')) }}
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/timers/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="del(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { isNil } from 'lodash-es';
import { getSocket } from 'src/panel/helpers/socket';

import { TimerInterface } from 'src/bot/database/entity/timer';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
})
export default class timersList extends Vue {
  socket = getSocket('/systems/timers')
  search: string = '';
  items: TimerInterface[] = [];
  state: { loading: number; } = { loading: this.$state.progress }

  fields = [
    { key: 'name', label: this.translate('timers.dialog.name'), sortable: true },
    // virtual attributes
    { key: 'triggerEveryMessage', label: this.translate('messages'), sortable: true, tdClass: 'font-weight-bold text-primary font-bigger' },
    { key: 'triggerEverySecond', label: this.capitalize(this.translate('seconds')), sortable: true, tdClass: 'font-weight-bold text-primary font-bigger' },
    { key: 'responses', label: this.translate('timers.dialog.responses') },
    { key: 'buttons', label: '' },
  ];

  get filtered() {
    if (this.search.length === 0) return this.items
    return this.items.filter((o) => {
      const isSearchInName = !isNil(o.name.match(new RegExp(this.search, 'ig')))
      return isSearchInName
    })
  }

  capitalize(value: string) {
    if (!value) return ''
    value = value.toString()
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, items: TimerInterface[]) => {
      this.items = items
      this.state.loading = this.$state.success;
    })
  }

  update(item: TimerInterface) {
    this.socket.emit('timers::save', item, () => {});
  }

  del(id: string) {
    this.socket.emit('generic::deleteById', id, () => {
      this.items = this.items.filter((o) => o.id !== id)
    })
  }

  linkTo(item: Required<TimerInterface>) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'TimersManagerEdit', params: { id: item.id } });
  }
}
</script>
