<template>
  <div>
    <div class="card p-0 m-0">
      <div class="card-header alert-warning text-uppercase"
           style="letter-spacing: -1px;"
           v-if="!pid">
        <font-awesome-icon icon="long-arrow-alt-left"/>
        Select permission group
      </div>
      <div v-else-if="isLoading"
           class="card-header alert-info text-uppercase"
           style="letter-spacing: -1px;">
        <font-awesome-icon icon="spinner" spin/>
        Loading in progress
      </div>
      <div v-else-if="item"
           class="card-header">
        <span>Settings</span>
      </div>

      <div class="card-body p-0 m-0" v-if="!isLoading && pid">
        <div class="pt-3">
          <div class="form-group col-md-12">
            <label for="name_input">{{ translate('core.permissions.input.name.title') }}</label>
            <input v-model="item.name" type="text" class="form-control" id="name_input" :placeholder="translate('core.permissions.input.name.placeholder')">
            <div class="invalid-feedback"></div>
          </div>

          <hold-button class="btn-danger"
                      @trigger="removePermission(pid)"
                      icon="trash"
                      v-if="!item.preserve">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
          <button type="button" class="btn btn-primary">{{translate('dialog.buttons.save.idle')}}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faLongArrowAltLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';

  import * as io from 'socket.io-client';

  library.add(faLongArrowAltLeft, faSpinner);

  export default Vue.extend({
    props: ['pid'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
      holdButton: () => import('../../../../components/holdButton.vue'),
    },
    data() {
      const data: {
        item: Permissions.Item | null,
        socket: any,
        isLoading: boolean,
      } = {
        item: null,
        socket: io('/core/permissions', { query: "token=" + this.token }),
        isLoading: true,
      }
      return data;
    },
    watch: {
      pid(val) {
        this.isLoading = true
        this.socket.emit('permission', val, (p) => {
          this.item = p;
          this.isLoading = false;
        })
      }
    },
    methods: {
      removePermission(pid) {
        console.log(pid);
      }
    }
  })
</script>

<style scoped>
</style>
