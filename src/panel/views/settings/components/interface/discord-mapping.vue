<template>
  <div>
    <loading no-margin slow v-if="loading === $state.progress"/>
    <b-alert show variant="danger" v-else-if="loading === $state.fail" style="margin: auto">
      Something went wrong loading data
    </b-alert>
    <div v-for="permission of permissions" v-bind:key="permission.id" v-else class="d-flex">
      <div class="input-group">
        <div class="input-group-prepend">
          <span class="input-group-text">
            {{permission.name}}
          </span>
          <span class="input-group-text">
            <fa icon="long-arrow-alt-right" fixed-width />
          </span>
        </div>
        <b-form-select :value="currentValue[permission.id] || ''" :options="roles" @change="updateMapping(permission.id, $event)"></b-form-select>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, PropSync, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { orderBy } from 'lodash-es';

import type { PermissionsInterface } from 'src/bot/database/entity/permissions';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons';
library.add(faLongArrowAltRight);

@Component({
  components: {
    loading: () => import('src/panel/components/loading.vue'),
  }})
export default class discordChannel extends Vue {
  @PropSync('value') currentValue: any;

  socket = getSocket('/integrations/discord')
  psocket = getSocket('/core/permissions')

  roles: { html: string, value: string }[] = []
  permissions: Required<PermissionsInterface>[] = [];

  loading: number = this.$state.progress;

  mounted() {
    this.loading = this.$state.progress;
    const getDataFromServer = Promise.all([
      new Promise((resolve) => {
        this.psocket.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
          if(err) {
            return console.error(err);
          }
          console.groupCollapsed('permissions')
          console.log({data});
          console.groupEnd();
          this.permissions = orderBy(data, 'order', 'asc');
          resolve()
        })
      }),
      new Promise((resolve, reject) => {
        this.socket.emit('discord::getRoles', (err: string | null, roles: { html: string; value: string }[]) => {
          console.groupCollapsed('discord::getRoles')
          console.log({roles});
          console.groupEnd();
          if (err) {
            reject();
            return console.error(err);
          }
          this.roles = [{ value: '', html: `-- ${this.translate('integrations.discord.settings.noRoleSelected')} --` }, ...roles];
          resolve()
        });
      })
    ]).catch(error => {
      console.error(error)
      this.loading = this.$state.fail;
    }).then(() => this.loading = this.$state.success);
    const timeout = new Promise(resolve => {
      setTimeout(() => {
        if (this.loading === this.$state.progress) {
          this.loading = this.$state.fail;
        }
        resolve()
      }, 10000);
    })

    Promise.race([ getDataFromServer, timeout ]).then(() => {});
  }

  @Watch('loading')
  checkEmptyRoles(val: number) {
    if (val === this.$state.success) {
      for (const permission of this.permissions) {
        if (this.currentValue[permission.id]) {
          if (!this.roles.find(o => String(o.value) === String(this.currentValue[permission.id]))) {
            this.updateMapping(permission.id, '');
          }
        }
      }
    }
  }

  updateMapping(permId: string, value: string) {
    Vue.set(this.currentValue, permId, value);
  }

  @Watch('currentValue')
  onChange() {
    this.$emit('update', { value: this.currentValue });
  }
};
</script>
