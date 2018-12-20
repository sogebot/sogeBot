<template>
  <div>
    <div class="col-sm-6" v-if="!opts.hideNewButton">
      <a class="btn btn-primary" href="#alias/edit"><i class="fas fa-plus"></i>
      {{ translate('systems.votes.new') }}</a>
    </div>
    <div class="col-sm text-right form-inline d-block pull-right">
      <button class="btn border-0" v-if="!opts.hideCardsButton" v-on:click="showAs='cards'" v-bind:class="[ showAs === 'cards' ? 'btn-dark' : 'btn-outline-dark' ]"><i
          class="fas fa-th-large"></i></button>
      <button class="btn border-0" v-if="!opts.hideTableButton" v-on:click="showAs='table'" v-bind:class="[ showAs === 'table' ? 'btn-dark' : 'btn-outline-dark' ]"><i
          class="fas fa-th-list"></i></button>
      <template v-if="!opts.hideShowInput">
        <i class="fas fa-search text-muted" style="position: relative; left: 2.2rem;"></i>
        <input type="search" class="form-control w-auto pl-5" v-model="search" placeholder="Search...">
      </template>
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
        showAs: 'cards',
        opts: {
          hideNewButton: false,

          hideCardsButton: false,
          hideTableButton: false,
          hideShowInput: false,
          ...this.options
        }
      }
    },
    watch: {
      showAs: function (value) {
        this.$emit('event', { type: 'showAs', value })
      }
    },
    mounted: function () {
      // set showAs if cards are hidden
      if (this.opts.hideCardsButton) this.showAs = 'table'
    }

  })
</script>