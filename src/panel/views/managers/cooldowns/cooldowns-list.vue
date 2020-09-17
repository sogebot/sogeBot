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

import { defineComponent, ref, onMounted, computed } from '@vue/composition-api'
import { isNil } from 'lodash-es';
import { escape } from 'xregexp';
import { CooldownInterface } from 'src/bot/database/entity/cooldown';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import translate from 'src/panel/helpers/translate';
import { error } from 'src/panel/helpers/error';

const socket = getSocket('/systems/cooldown');

export default defineComponent({
  components: {
    loading: () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  },
  setup(props, context) {
    const items = ref([] as CooldownInterface[]);
    const search = ref('');
    const state = ref({
      loading: ButtonStates.progress,
    } as {
      loading: number;
    })

    const fields = [
      { key: 'name', label: '!' + translate('command') + ' ' + translate('or') + ' ' + translate('keyword'), sortable: true },
      {
        key: 'miliseconds',
        label: translate('cooldown'),
        sortable: true,
      },
      { key: 'type', label: translate('type'), sortable: true, formatter: (value: string) => translate(value) },
      { key: 'isErrorMsgQuiet', label: capitalize(translate('quiet')), sortable: true },
      { key: 'isOwnerAffected', label: capitalize(translate('core.permissions.casters')), sortable: true },
      { key: 'isModeratorAffected', label: capitalize(translate('core.permissions.moderators')), sortable: true },
      { key: 'isSubscriberAffected', label: capitalize(translate('core.permissions.subscribers')), sortable: true },
      { key: 'isFollowerAffected', label: capitalize(translate('core.permissions.followers')), sortable: true },
      { key: 'buttons', label: '' },
    ];

    const fItems = computed(() => {
      if (search.value.length === 0) return items.value
      return items.value.filter((o) => {
        const isSearchInKey = !isNil(o.name.match(new RegExp(escape(search.value), 'ig')))
        return isSearchInKey
      })
    })

    onMounted(() => {
      state.value.loading = ButtonStates.progress;
      socket.emit('generic::getAll', (err: string | null, itemsGetAll: CooldownInterface[]) => {
        if (err) {
          return error(err);
        }
        console.debug('Loaded', items)
        items.value = itemsGetAll;
        state.value.loading = ButtonStates.success;
      })
    });

    const linkTo = (item: Required<CooldownInterface>) => {
      console.debug('Clicked', item.id);
      context.root.$router.push({ name: 'cooldownsManagerEdit', params: { id: item.id } }).catch(() => {});
    }
    const remove = (id: string) => {
      socket.emit('generic::deleteById', id, () => {
        items.value = items.value.filter((o) => o.id !== id)
      })
    }
    const update = (item: Required<CooldownInterface>) => {
      socket.emit('cooldown::save', item , () => {});
    }

    return {
      items,
      search,
      state,
      fields,
      linkTo,
      remove,
      update,
      fItems
    }
  }
});
</script>