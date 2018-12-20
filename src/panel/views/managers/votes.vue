<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <span class="title text-default"> {{ commons.translate('menu.votes') }}</span>
      </div>
    </div>

    <panel class="pt-3 pb-3 mt-3 mb-3 m-0 border-top border-bottom row"
      :options="{ showNewButton: false }"></panel>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  export default Vue.extend({
    props: ['commons'],
    components: {
      panel: () => import('../../components/panel.vue')
    },
    data: function () {
      return {
      }
    },
  })
</script>