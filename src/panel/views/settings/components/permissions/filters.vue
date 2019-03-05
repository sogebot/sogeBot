<template>
  <div>
    <div class="col-12" v-if="cFilters.length > 0">
      <div class="row">
        <div class="form-group col-md-4 pb-0 mb-0">
          <label for="name_input" class="text-muted text-uppercase font-weight-light">{{ translate('registry.goals.input.filterType.title') }}</label>
        </div>
        <div class="form-group col-md-4 pb-0 mb-0">
          <label for="name_input" class="text-muted text-uppercase font-weight-light">{{ translate('registry.goals.input.filterComparator.title') }}</label>
        </div>
        <div class="form-group col-md-4 pb-0 mb-0">
          <label for="name_input" class="text-muted text-uppercase font-weight-light">{{ translate('registry.goals.input.filterValue.title') }}</label>
        </div>
      </div>
    </div>
    <div class="col-12" v-for="filter of cFilters" :key="filter.comparator + filter.type + filter.value">
      <div class="row">
        <div class="form-group col-md-4">
          <select v-model="filter.type" class="form-control">
            <option value="watched">Watched Time</option>
            <option value="tips">Tips</option>
            <option value="bits">Bits</option>
            <option value="messages">Messages</option>
            <option value="subtier">Sub Tier (1, 2 or 3)</option>
            <option value="subcumulativemonths">Sub Cumulative Months</option>
            <option value="substreakmonths">Sub Streak Months</option>
          </select>
        </div>
        <div class="form-group col-md-4">
          <select v-model="filter.comparator" class="form-control">
            <option value="<">is lower than</option>
            <option value="<=">is lower than or equals</option>
            <option value="==">equals</option>
            <option value=">=">is higher than or equals</option>
            <option value=">">is higher than</option>
          </select>
        </div>
        <div class="form-group col-md-4">
          <input v-model.lazy.number="filter.value" type="number" class="form-control"/>
        </div>
      </div>
    </div>
    <button type="button" class="btn btn-outline-primary pt-2" @click="add">Add filter</button>
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
