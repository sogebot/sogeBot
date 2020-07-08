<template lang="pug">
  b-container(fluid ref="window")
    b-row
      b-col
        span.title.text-default.mb-2
          | {{ translate('menu.registry') }}
          small.px-2
            fa(icon="angle-right")
          | {{ translate('menu.randomizer') }}

    panel
      template(v-slot:left)
        button-with-icon(icon="plus" href="#/registry/randomizer/edit").btn-primary.btn-reverse {{ translate('registry.randomizer.addRandomizer') }}
      template(v-slot:right)
        button-with-icon(
          text="/overlays/randomizer"
          href="/overlays/randomizer"
          class="btn-dark mr-2 ml-0"
          icon="link"
          target="_blank"
        )

    loading(v-if="state.loading !== $state.success")
    b-table(v-else :fields="fields" :items="filteredItems" hover striped small @row-clicked="linkTo($event)")
      template(v-slot:cell(permissionId)="data")
        span(v-if="getPermissionName(data.item.permissionId)") {{ getPermissionName(data.item.permissionId) }}
        span(v-else class="text-danger")
          fa(icon="exclamation-triangle") Permission not found
      template(v-slot:cell(options)="data")
        | {{ Array.from(new Set(orderBy(data.item.items, 'order').map(o => o.name))).join(', ') }}
      template(v-slot:cell(buttons)="data")
        div(style="width: max-content !important;").float-right
          button-with-icon(icon="clone" @click="clone(data.item)").btn-only-icon.btn-secondary.btn-reverse
          button-with-icon(
            @click="toggleVisibility(data.item)"
            :class="{ 'btn-success': data.item.isShown, 'btn-danger': !data.item.isShown }"
            :icon="!data.item.isShown ? 'eye-slash' : 'eye'"
          ).btn-only-icon
          button-with-icon(
            @click="startSpin"
            class="btn-secondary ml-0 mr-0"
            icon="circle-notch" :spin="spin" :disabled="spin"
          ).btn-only-icon
          button-with-icon(icon="edit" v-bind:href="'#/registry/randomizer/edit/' + data.item.id").btn-only-icon.btn-primary.btn-reverse
            | {{ translate('dialog.buttons.edit') }}
          hold-button(@trigger="remove(data.item)" icon="trash").btn-danger.btn-reverse.btn-only-icon
            template(slot="title") {{translate('dialog.buttons.delete')}}
            template(slot="onHoldTitle") {{translate('dialog.buttons.hold-to-delete')}}
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { v4 as uuid } from 'uuid';
import { orderBy } from 'lodash-es';

import type { RandomizerInterface } from 'src/bot/database/entity/randomizer';
import type { PermissionsInterface } from 'src/bot/database/entity/permissions';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faExclamationTriangle, faClone } from '@fortawesome/free-solid-svg-icons';
library.add(faExclamationTriangle, faClone)

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
})
export default class randomizerList extends Vue {
  orderBy = orderBy;
  psocket: SocketIOClient.Socket = getSocket('/core/permissions');
  socket: SocketIOClient.Socket =  getSocket('/registries/randomizer');

  fields = [
    { key: 'name', label: this.translate('registry.randomizer.form.name'), sortable: true },
    { key: 'command', label: this.translate('registry.randomizer.form.command'), sortable: true },
    { key: 'permissionId', label: this.translate('registry.randomizer.form.permission') },
    // virtual attributes
    { key: 'options', label: this.translate('registry.randomizer.form.options') },
    { key: 'buttons', label: '' },
  ];

  items: Required<RandomizerInterface>[] = [];
  permissions: {id: string; name: string;}[] = [];
  search: string = '';
  spin = false;

  state: {
    loading: number;
  } = {
    loading: this.$state.idle,
  };

  get filteredItems() {
    return this.items;
  }

  clone(item: Required<RandomizerInterface>) {
    const clonedItemId = uuid();

    const clonedItemsRemapId = new Map();
    // remap items ids
    const clonedItems = item.items.map(o => {
      clonedItemsRemapId.set(o.id, uuid())
      return { ...o, id: clonedItemsRemapId.get(o.id) }
    })

    const clonedItem = {
      ...item,
      id: clonedItemId,
      name: item.name + ' (clone)',
      command: `!${Math.random().toString(36).substr(2, 5)}`,
      // we need to do another .map as we need to find groupId
      items: clonedItems.map(o => ({ ...o, groupId: o.groupId === null ? o.groupId : clonedItemsRemapId.get(o.groupId) })),
    }
    this.socket.emit('randomizer::save', clonedItem, (err: Error | null) => {
      if (err) {
        console.error(err);
      }
      this.refresh();
    })
  }

  toggleVisibility(item: Required<RandomizerInterface>) {
    item.isShown = !item.isShown;
    if(item.isShown) {
      this.socket.emit('randomizer::showById', item.id, () => {
        this.refresh();
      });
    } else {
      this.socket.emit('randomizer::hideAll', () => {
        this.refresh();
      });
    }
  }

  mounted() {
    this.state.loading = this.$state.progress;
    this.refresh();
  }

  async refresh() {
    await Promise.all([
      new Promise(async(done) => {
        this.psocket.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
          if(err) {
            return console.error(err);
          }
          this.permissions = data
          done();
        });
      }),
      new Promise(async(done) => {
        this.socket.emit('generic::getAll', (err: string | null, data: Required<RandomizerInterface>[]) => {
          if (err) {
            return console.error(err);
          }
          console.groupCollapsed('generic::getAll')
          console.debug(data);
          console.groupEnd;
          this.items = data;
          done();
        })
      })
    ])

    this.state.loading = this.$state.success;
  }

  startSpin() {
    this.spin = true;
    this.socket.emit('randomizer::startSpin', () => {});
    setTimeout(() => {
      this.spin = false;
    }, 5000);
  }

  remove(item: RandomizerInterface) {
    this.socket.emit('randomizer::remove', item, (err: string | null) => {
      if (err) {
        console.error(err);
      } else {
        this.refresh();
      }
    })
  }

  linkTo(item: Required<RandomizerInterface>) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'RandomizerRegistryEdit', params: { id: item.id } });
  }

  getPermissionName(id: string | null) {
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