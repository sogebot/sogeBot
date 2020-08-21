<template>
  <b-form-group
    :label="translate('permissions-to-apply')"
    label-for="name"
  >
    <b-spinner v-if="state.loading !== $state.success"/>
    <b-list-group v-else>
      <b-list-group-item @click="value = []" :variant="value.length === 0 ? 'success' : ''">All <fa v-if="value.length === 0" icon="check" style="float:right; height: 24px"/></b-list-group-item>
      <b-list-group-item
        v-for="permission of permissions" :key="permission.id"
        :variant="value.includes(permission.id) ? 'success' : ''"
        @click="toggle(permission.id)"
      >
        {{permission.name}}
        <fa v-if="value.includes(permission.id)" icon="check" style="float:right; height: 24px"/>
      </b-list-group-item>
    </b-list-group>
  </b-form-group>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import type { PermissionsInterface } from 'src/bot/database/entity/permissions';
import { orderBy, xor } from 'lodash-es';

@Component({})
export default class extends Vue {
  psocket = getSocket('/core/permissions')

  value: string[] = []

  state: {
    loading: number;
  } = {
    loading: this.$state.progress,
  }

  permissions: PermissionsInterface[] = [];

  toggle(id: string) {
    this.value = xor(this.value, [id])
  }

  async mounted() {
    await new Promise((resolve) => {
      this.psocket.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
        if(err) {
          return console.error(err);
        }
        this.permissions = orderBy(data, 'order', 'asc');
        resolve()
      })
    })
    this.state.loading = this.$state.success;
  }
};
</script>
