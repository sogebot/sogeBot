<template>
  <div class="card p-0 m-0">
    <div class="card-header">
      {{translate('core.permissions.permissionsGroups')}}
    </div>
    <div class="card-body p-0 m-0">
      <div class="list-group list-group-flush">
        <button v-for="p of orderBy(currentData, 'order')"
                class="list-group-item list-group-item-action"
                :class="{ active: $route.params.id === p.id }"
                style="font-size:1.2em; font-family: 'PT Sans Narrow', sans-serif;"
                :key="p.id"
                :style="{'cursor': p.id === '0efd7b1c-e460-4167-8e06-8aaf2c170311' ? 'inherit' : 'grab' }"
                @click="setPermission(p.id)"
                v-on:dragstart="dragstart(p.id, $event)"
                v-on:dragenter="dragenter(p.id, $event)"
                :draggable="p.id !== '0efd7b1c-e460-4167-8e06-8aaf2c170311'"
                >

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
  import { orderBy, isEqual } from 'lodash-es';

  import { PermissionsInterface } from 'src/bot/database/entity/permissions'

  export default Vue.extend({
    props: ['permissions'],
    data() {
      const data: {
        orderBy: any;
        draggingPID: null | string,
        currentData: PermissionsInterface[],
        socket: any,
      } = {
        orderBy: orderBy,
        draggingPID: null,
        currentData: this.permissions,
        socket: getSocket('/core/permissions'),
      }
      return data
    },
    watch: {
      permissions: {
        deep: true,
        handler(val) {
          this.currentData = val;
        }
      },
      currentData: {
        deep: true,
        handler(val) {
          if (!isEqual(val, this.permissions)) {
            this.$emit('update:permissions', val);
          }
        }
      }
    },
    methods: {
      setPermission(pid: string) {
        this.$router.push({ name: 'PermissionsSettings', params: { id: pid } }).catch(err => {})
      },
      dragstart: function(pid: string, e: DragEvent) {
        if (pid !== '0efd7b1c-e460-4167-8e06-8aaf2c170311') {
          this.draggingPID = pid;
          e.dataTransfer?.setData('text/plain', 'dummy');
        } else {
          this.draggingPID = null;
          e.stopPropagation();
        }
      },
      dragenter: async function(pid: string, e: DragEvent) {
        if (this.draggingPID === null || pid === '0efd7b1c-e460-4167-8e06-8aaf2c170311') {
          return;
        }
        const dragged = this.currentData.find((o) => o.id === this.draggingPID)
        const drop = this.currentData.find((o) => o.id === pid)

        if (dragged && drop && drop.id !== dragged.id) {
          const oldOrderOfDragged = dragged.order
          const newOrderOfDragged = drop.order;

          for (const permission of this.currentData.filter((o) => o.order >= Math.min(oldOrderOfDragged, newOrderOfDragged) && o.order <= Math.max(oldOrderOfDragged, newOrderOfDragged))) {
            if (oldOrderOfDragged > newOrderOfDragged) {
              permission.order++;
            } else {
              permission.order--;
            }
          }
          dragged.order = newOrderOfDragged;
        }

        this.$forceUpdate();
      },
    }
  })
</script>
