<template>
  <div class="card p-0 m-0">
    <div class="card-header">
      {{translate('core.permissions.permissionsGroups')}}
    </div>
    <div class="card-body p-0 m-0">
      <div class="list-group list-group-flush">
        <div v-if="isLoading"
             class="text-uppercase list-group-item list-group-item-info"
             style="letter-spacing: -1px;">
          <fa icon="spinner" spin/>
          {{translate('core.permissions.loadingInProgress')}}
        </div>
        <button v-for="p of orderBy(currentData, 'order')"
                class="list-group-item list-group-item-action"
                :class="{ active: $route.params.id === p.id }"
                style="font-size:1.2em; font-family: 'PT Sans Narrow', sans-serif;"
                :key="p.name"
                :style="{'cursor': p.id === '0efd7b1c-e460-4167-8e06-8aaf2c170311' ? 'inherit' : 'grab' }"
                @click="setPermission(p.id)"
                v-on:dragstart="dragstart(p.id, $event)"
                v-on:dragenter="dragenter(p.id, $event)"
                v-on:dragend="dragend()"
                :draggable="p.id !== '0efd7b1c-e460-4167-8e06-8aaf2c170311'"
                v-else>

          <fa icon="greater-than-equal" fixed-width v-if="p.isWaterfallAllowed" size="xs" transform="shrink-8"/>
          <fa icon="equals" fixed-width v-else size="xs" transform="shrink-8"/>
          <template v-if="p.name.length > 0">
            <strong v-if="p.isCorePermission">{{ p.name }}</strong>
            <span v-else>{{ p.name }}</span>
          </template>
          <small v-else
                 class="font-weight-lighter"
                 style="font-size: 0.7rem !important; letter-spacing: 1px;"
                 :class="{ 'text-dark': $route.params.id !== p.id, 'text-light': $route.params.id === p.id }">{{p.id}}</small>
          <small v-if="p.automation"
                 class="text-uppercase"
                 :class="{ 'text-dark': $route.params.id !== p.id, 'text-light': $route.params.id === p.id }"
                 style="font-size: 0.7rem !important; letter-spacing: 1px;">
            <fa icon="cog"></fa> {{ translate('core.permissions.' + p.automation) }}
          </small>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { getSocket } from 'src/panel/helpers/socket';
  import { orderBy } from 'lodash-es';

  import { PermissionsInterface } from 'src/bot/database/entity/permissions'

  export default Vue.extend({
    props: ['update'],
    data() {
      const data: {
        orderBy: any;
        draggingPID: null | string,
        currentData: PermissionsInterface[],
        socket: any,
        isLoading: boolean,
      } = {
        orderBy: orderBy,
        draggingPID: null,
        currentData: [],
        socket: getSocket('/core/permissions'),
        isLoading: true,
      }
      return data
    },
    mounted() {
      this.refresh();
    },
    watch: {
      update() {
        this.refresh()
      },
    },
    methods: {
      refresh() {
        this.socket.emit('permissions', (err: string | null, data: PermissionsInterface[]) => {
          if (err) {
            return console.error(err);
          }
          this.currentData = data;
          this.isLoading = false;
        })
      },
      dragend() {
        this.socket.emit('permission::order', this.currentData, () => {
          this.$emit('update');
        });
      },
      setPermission(pid: string) {
        this.$router.push({ name: 'PermissionsSettings', params: { id: pid } })
      },
      dragstart: function(pid: string, e: DragEvent) {
        if (pid !== '0efd7b1c-e460-4167-8e06-8aaf2c170311') {
          this.setPermission(pid);
          this.draggingPID = pid;
          e.dataTransfer?.setData('text/plain', 'dummy');
        } else {
          this.draggingPID = null;
          e.stopPropagation();
        }
      },
      dragenter: function(pid: string, e: DragEvent) {
        if (this.draggingPID === null || pid === '0efd7b1c-e460-4167-8e06-8aaf2c170311') {
          return;
        }
        const dragged = this.currentData.find((o) => o.id === this.draggingPID)
        const drop = this.currentData.find((o) => o.id === pid)

        if (dragged && drop) {
          const order = dragged.order;
          dragged.order = drop.order;
          drop.order = order;
        }

        this.$forceUpdate()
      },
    }
  })
</script>
