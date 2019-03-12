<template>
  <textarea v-on:keyup="update" v-model="currentValue" class="form-control" type="text"></textarea>
</template>

<script lang="ts">
  import Vue from 'vue'

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { faLink, faEdit } from '@fortawesome/free-solid-svg-icons';

  library.add(faLink, faEdit)

  export default Vue.extend({
    props: ['value', 'title'],
    methods: {
      update: function () {
        this.$emit('update', this.currentValue.split('\n'))
      }
    },
    data: function () {
      return {
        currentValue: this.value.join('\n')
      }
    },
  });
</script>