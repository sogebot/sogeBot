<template>
  <div
    ref="window"
    class="container-fluid"
  >
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.alerts') }}
        </span>
      </div>
    </div>

    <panel
      search
      @search="search = $event"
    >
      <template #left>
        <button-with-icon
          class="btn-primary btn-reverse"
          icon="plus"
          href="#/registry/alerts/edit"
        >
          {{ translate('dialog.title.add') }}
        </button-with-icon>
      </template>
      <template #right>
        <b-button
          id="registryAlertsToggleButton"
          class="border-0"
          :variant="areAlertsMuted ? 'secondary' : 'dark'"
          @click="areAlertsMuted = !areAlertsMuted"
        >
          <fa
            v-if="!areAlertsMuted"
            icon="bell"
            fixed-width
          />
          <fa
            v-else
            icon="bell-slash"
            fixed-width
          />
        </b-button>
        <b-tooltip
          target="registryAlertsToggleButton"
          :title="areAlertsMuted ? 'Alerts are disabled.' : 'Alerts are enabled!'"
        />
        <b-button
          v-b-modal.alert-test-modal
          variant="secondary"
        >
          {{ translate('registry.alerts.test') }}
        </b-button>
      </template>
    </panel>

    <b-modal
      id="alert-test-modal"
      :title="translate('registry.alerts.testDlg.alertTester')"
      hide-footer
    >
      <test />
    </b-modal>

    <loading v-if="state.loaded === $state.progress" />
    <b-alert
      v-else-if="state.loaded === $state.success && filtered.length === 0 && search.length > 0"
      show
      variant="danger"
    >
      <fa icon="search" /> <span v-html="translate('registry.alerts.emptyAfterSearch').replace('$search', search)" />
    </b-alert>
    <b-alert
      v-else-if="state.loaded === $state.success && items.length === 0"
      show
    >
      {{ translate('registry.alerts.empty') }}
    </b-alert>
    <b-table
      v-else
      :fields="fields"
      :items="filtered"
      hover
      small
      style="cursor: pointer;"
      @row-clicked="linkTo($event)"
    >
      <template #cell(additional-info)="data">
        <span :class="{'text-primary': data.item.follows.length > 0, 'text-muted': data.item.follows.length === 0}">
          FOLLOW<span v-if="data.item.follows.length > 0">({{ data.item.follows.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.hosts.length > 0, 'text-muted': data.item.hosts.length === 0}">
          HOSTS<span v-if="data.item.hosts.length > 0">({{ data.item.hosts.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.raids.length > 0, 'text-muted': data.item.raids.length === 0}">
          RAID<span v-if="data.item.raids.length > 0">({{ data.item.raids.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.cheers.length > 0, 'text-muted': data.item.cheers.length === 0}">
          CHEERS<span v-if="data.item.cheers.length > 0">({{ data.item.cheers.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.subs.length > 0, 'text-muted': data.item.subs.length === 0}">
          SUBS<span v-if="data.item.subs.length > 0">({{ data.item.subs.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.resubs.length > 0, 'text-muted': data.item.resubs.length === 0}">
          RESUBS<span v-if="data.item.resubs.length > 0">({{ data.item.resubs.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.subgifts.length > 0, 'text-muted': data.item.subgifts.length === 0}">
          SUBGIFTS<span v-if="data.item.subgifts.length > 0">({{ data.item.subgifts.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.subcommunitygifts.length > 0, 'text-muted': data.item.subcommunitygifts.length === 0}">
          SUBCOMMUNITYGIFTS<span v-if="data.item.subcommunitygifts.length > 0">({{ data.item.subcommunitygifts.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.tips.length > 0, 'text-muted': data.item.tips.length === 0}">
          TIPS<span v-if="data.item.tips.length > 0">({{ data.item.tips.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.cmdredeems.length > 0, 'text-muted': data.item.cmdredeems.length === 0}">
          CMDREDEEMS<span v-if="data.item.cmdredeems.length > 0">({{ data.item.cmdredeems.length }})</span>
        </span>
        <span :class="{'text-primary': data.item.rewardredeems.length > 0, 'text-muted': data.item.rewardredeems.length === 0}">
          RWDREDEEMS<span v-if="data.item.rewardredeems.length > 0">({{ data.item.rewardredeems.length }})</span>
        </span>
      </template>
      <template #cell(buttons)="data">
        <div class="text-right">
          <button-with-icon
            class="btn-only-icon btn-secondary btn-reverse"
            icon="clone"
            @click="clone(data.item)"
          />
          <button-with-icon
            :text="'/overlays/alerts/' + data.item.id"
            :href="'/overlays/alerts/' + data.item.id"
            class="btn-dark btn-only-icon"
            icon="link"
            target="_blank"
          />
          <button-with-icon
            class="btn-only-icon btn-primary btn-reverse"
            icon="edit"
            :href="'#/registry/alerts/edit/' + data.item.id"
          >
            {{ translate('dialog.buttons.edit') }}
          </button-with-icon>
          <hold-button
            icon="trash"
            class="btn-danger btn-reverse btn-only-icon"
            @trigger="del(data.item)"
          >
            <template slot="title">
              {{ translate('dialog.buttons.delete') }}
            </template>
            <template slot="onHoldTitle">
              {{ translate('dialog.buttons.hold-to-delete') }}
            </template>
          </hold-button>
        </div>
      </template>
    </b-table>
  </div>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faBell, faBellSlash, faClone,
} from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { v4 as uuid } from 'uuid';
import {
  Component, Vue, Watch,
} from 'vue-property-decorator';

import type { AlertInterface } from 'src/bot/database/entity/alert';

library.add(faClone, faBell, faBellSlash);

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'test':    () => import('./alerts-test.vue'),
  },
  filters: {
    capitalize: function (value: string) {
      if (!value) {
        return '';
      }
      value = value.toString();
      return value.charAt(0).toUpperCase() + value.slice(1);
    },
  },
})
export default class customVariablesList extends Vue {
  translate = translate;
  socket = getSocket('/registries/alerts');
  areAlertsMuted = false;

  fields = [
    {
      key: 'name', label: translate('registry.alerts.name.name'), sortable: true,
    },
    // virtual attributes
    { key: 'additional-info', label: translate('registry.customvariables.additional-info') },
    { key: 'buttons', label: '' },
  ];

  items: AlertInterface[] = [];
  search = '';

  state: { loaded: number; } = { loaded: this.$state.progress };

  get filtered(): AlertInterface[] {
    let items = this.items;
    if (this.search.trim() !== '') {
      items = this.items.filter((o) => {
        return o.name.trim().toLowerCase().includes(this.search.trim().toLowerCase());
      });
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
    });
  }

  clone(item: Required<AlertInterface>) {
    const mediaMap = new Map() as Map<string, string>;
    this.socket.emit('alerts::save', {
      ...item,
      id:        uuid(),
      updatedAt: Date.now(),
      name:      item.name + ' (clone)',
      follows:   item.follows.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      subs: item.subs.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      subgifts: item.subgifts.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      subcommunitygifts: item.subcommunitygifts.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      hosts: item.hosts.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      raids: item.raids.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      tips: item.tips.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      cheers: item.cheers.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      resubs: item.resubs.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      cmdredeems: item.cmdredeems.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      rewardredeems: item.rewardredeems.map(o => {
        mediaMap.set(o.soundId, uuid());
        mediaMap.set(o.imageId, uuid());
        return {
          ...o, id: uuid(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
    } as AlertInterface, async (err: string | null, data: AlertInterface) => {
      if (err) {
        return console.error(err);
      }

      for (const mediaId of mediaMap.keys()) {
        await new Promise<void>(resolve => {
          this.socket.emit('alerts::cloneMedia', [mediaId, mediaMap.get(mediaId)], (err2: string | null) => {
            if (err2) {
              console.error(err2);
            }
            resolve();
          });
        });
      }
      this.refresh();
    });
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
    });
  }

  refresh() {
    this.state.loaded = this.$state.progress;
    this.socket.emit('generic::getAll', (err: string | null, data: AlertInterface[]) => {
      if (err) {
        return console.error(err);
      }
      console.debug('Loaded', data);
      this.items = data;
      this.state.loaded = this.$state.success;
    });
  }

  mounted() {
    this.refresh();
    this.onRouteChange();
  }

  @Watch('$route')
  onRouteChange() {
    this.socket.emit('alerts::areAlertsMuted', null, (err: Error | null, val: boolean) => {
      this.areAlertsMuted = val;
    });
  }
  @Watch('areAlertsMuted')
  areAlertsMutedWatch(val: boolean) {
    this.socket.emit('alerts::areAlertsMuted', val, () => {
      return;
    });
  }
}
</script>