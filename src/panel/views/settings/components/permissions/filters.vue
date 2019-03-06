<template>
  <div>
    <div class="col-12" v-if="cFilters.length > 0">
      <div class="row">
        <div class="form-group col-md-4 pb-0 mb-0">
          <label for="name_input" class="text-muted text-uppercase font-weight-light">{{ translate('core.permissions.type') }}</label>
        </div>
        <div class="form-group col-md-4 pb-0 mb-0"></div>
        <div class="form-group col-md-4 pb-0 mb-0">
          <label for="name_input" class="text-muted text-uppercase font-weight-light">{{ translate('core.permissions.value') }}</label>
        </div>
      </div>
    </div>
    <div class="col-12" v-for="filter of cFilters" :key="filter.comparator + filter.type + filter.value">
      <div class="row">
        <div class="form-group col-md-4">
          <select v-model="filter.type" class="form-control">
            <option value="watched">{{ translate('core.permissions.watchedTime') }}</option>
            <option value="tips">{{ translate('core.permissions.tips') }}</option>
            <option value="bits">{{ translate('core.permissions.bits') }}</option>
            <option value="messages">{{ translate('core.permissions.messages') }}</option>
            <option value="subtier">{{ translate('core.permissions.subtier') }}</option>
            <option value="subcumulativemonths">{{ translate('core.permissions.subcumulativemonths') }}</option>
            <option value="substreakmonths">{{ translate('core.permissions.substreakmonth') }}</option>
          </select>
        </div>
        <div class="form-group col-md-4">
          <select v-model="filter.comparator" class="form-control">
            <option value="<">{{ translate('core.permissions.isLowerThan') }}</option>
            <option value="<=">{{ translate('core.permissions.isLowerThanOrEquals') }}</option>
            <option value="==">{{ translate('core.permissions.equals') }}</option>
            <option value=">=">{{ translate('core.permissions.isHigherThanOrEquals') }}</option>
            <option value=">">{{ translate('core.permissions.isHigherThan') }}</option>
          </select>
        </div>
        <div class="form-group col-md-4">
          <input v-model.lazy.number="filter.value" type="number" class="form-control"/>
        </div>
      </div>
    </div>
    <button type="button" class="btn btn-outline-primary pt-2 ml-2" @click="add">{{ translate('core.permissions.addFilter') }}</button>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import {  } from '@fortawesome/free-solid-svg-icons';

  import * as io from 'socket.io-client';

  library.add();

  export default Vue.extend({
    props: ['filters'],
    components: {
      'font-awesome-icon': FontAwesomeIcon,
    },
    data() {
      const data: {
        cFilters: Permissions.Filter[],
      } = {
        cFilters: this.filters,
      }
      return data;
    },
    methods: {
      add() {
        this.cFilters.push({
          comparator: '>=',
          type: 'watched',
          value: 0,
        })
      }
    }
  })
</script>

<style scoped>
</style>
