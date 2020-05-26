<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.cooldown') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'cooldown').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/cooldowns/edit">{{translate('systems.cooldown.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-alert show variant="danger" v-else-if="state.loading === $state.success && fItems.length === 0 && search.length > 0">
      <fa icon="search"/> <span v-html="translate('systems.cooldown.emptyAfterSearch').replace('$search', search)"/>
    </b-alert>
    <b-alert show v-else-if="state.loading === $state.success && items.length === 0">
      {{translate('systems.cooldown.empty')}}
    </b-alert>
    <b-table v-else striped small hover :items="fItems" :fields="fields" @row-clicked="linkTo($event)">
      <template v-slot:cell(miliseconds)="data">
        <span class="font-weight-bold text-primary font-bigger">{{Number(data.item.miliseconds / 60000).toFixed(1)}}</span> {{translate('minutes')}}
      </template>
      <template v-slot:cell(isErrorMsgQuiet)="data">
        {{ data.item.isErrorMsgQuiet ? translate('commons.yes') : translate('commons.no') }}
      </template>
      <template v-slot:cell(isOwnerAffected)="data">
        {{ data.item.isOwnerAffected ? translate('commons.yes') : translate('commons.no') }}
      </template>
      <template v-slot:cell(isModeratorAffected)="data">
        {{ data.item.isModeratorAffected ? translate('commons.yes') : translate('commons.no') }}
      </template>
      <template v-slot:cell(isSubscriberAffected)="data">
        {{ data.item.isSubscriberAffected ? translate('commons.yes') : translate('commons.no') }}
      </template>
      <template v-slot:cell(isFollowerAffected)="data">
        {{ data.item.isFollowerAffected ? translate('commons.yes') : translate('commons.no') }}
      </template>
      <template v-slot:cell(buttons)="data">
        <div class="float-right" style="width: max-content !important;">
          <button-with-icon :class="[ data.item.isEnabled ? 'btn-success' : 'btn-danger' ]" class="btn-only-icon btn-reverse" icon="power-off" @click="data.item.isEnabled = !data.item.isEnabled; update(data.item)">
            {{ translate('dialog.buttons.' + (data.item.isEnabled? 'enabled' : 'disabled')) }}
          </button-with-icon>
          <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/cooldowns/edit/' + data.item.id">
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button @trigger="remove(data.item.id)" icon="trash" class="btn-danger btn-reverse btn-only-icon">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from 'src/panel/helpers/socket';
import { capitalize } from 'src/panel/helpers/capitalize';

import { Vue, Component/*, Watch */ } from 'vue-property-decorator';
import { isNil } from 'lodash-es';
import { escape } from 'xregexp';
import { CooldownInterface } from 'src/bot/database/entity/cooldown';

@Component({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
})
export default class cooldownList extends Vue {
  socket = getSocket('/systems/cooldown');

  items: CooldownInterface[] = [];
  search: string = '';
  state: {
    loading: number;
  } = {
    loading: this.$state.progress,
  }

  fields = [
    { key: 'name', label: '!' + this.translate('command') + ' ' + this.translate('or') + ' ' + this.translate('keyword'), sortable: true },
    {
      key: 'miliseconds',
      label: this.translate('cooldown'),
      sortable: true,
    },
    { key: 'type', label: this.translate('type'), sortable: true, formatter: (value: string) => this.translate(value) },
    { key: 'isErrorMsgQuiet', label: capitalize(this.translate('quiet')), sortable: true },
    { key: 'isOwnerAffected', label: capitalize(this.translate('core.permissions.casters')), sortable: true },
    { key: 'isModeratorAffected', label: capitalize(this.translate('core.permissions.moderators')), sortable: true },
    { key: 'isSubscriberAffected', label: capitalize(this.translate('core.permissions.subscribers')), sortable: true },
    { key: 'isFollowerAffected', label: capitalize(this.translate('core.permissions.followers')), sortable: true },
    { key: 'buttons', label: '' },
  ];

  get fItems() {
    if (this.search.length === 0) return this.items
    return this.items.filter((o) => {
      const isSearchInKey = !isNil(o.name.match(new RegExp(escape(this.search), 'ig')))
      return isSearchInKey
    })
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, items: CooldownInterface[]) => {
      if (err) {
        return console.error(err);
      }
      console.debug('Loaded', items)
      this.items = items;
      this.state.loading = this.$state.success;
    })
  }

  linkTo(item: Required<CooldownInterface>) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'cooldownsManagerEdit', params: { id: item.id } });
  }

  remove(id: string) {
   this.socket.emit('generic::deleteById', id, () => {
      this.items = this.items.filter((o) => o.id !== id)
    })
  }

  update(item: Required<CooldownInterface>) {
    this.socket.emit('cooldown::save', item , () => {});
  }
}
</script>