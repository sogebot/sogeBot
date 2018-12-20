<template>
  <div>
    <div class="col-sm-6" v-if="opts.showNewButton">
      <a class="btn btn-primary" href="#alias/edit"><i class="fas fa-plus"></i>
      {{ translate('systems.votes.new') }}</a>
    </div>
    <div class="col-sm text-right form-inline d-block pull-right">
      <button class="btn border-0" v-on:click="showAs='cards'" v-bind:class="[ showAs === 'cards' ? 'btn-dark' : 'btn-outline-dark' ]"><i
          class="fas fa-th-large"></i></button>
      <button class="btn border-0" v-on:click="showAs='table'" v-bind:class="[ showAs === 'table' ? 'btn-dark' : 'btn-outline-dark' ]"><i
          class="fas fa-th-list"></i></button>
      <i class="fas fa-search text-muted" style="position: relative; left: 2.2rem;"></i>
      <input type="search" class="form-control w-auto pl-5" v-model="search" placeholder="Search...">
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  export default Vue.extend({
    props: ['commons', 'options'],
    components: {
    },
    data: function () {
      return {
        opts: {
          showNewButton: true,
          ...this.options
        }
      }
    },

  })
</script>