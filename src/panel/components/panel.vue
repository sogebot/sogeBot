<template>
  <div class="border-bottom row py-2 m-0"
    :class="sidebar ? [ 'py-2', 'border-top-0', 'border-gray', 'bg-opaque' ] : ['border-top', 'mb-3']">
    <div class="slot-left col-auto mr-auto d-flex" v-if="!!this.$slots.left" style="height: max-content;">
      <slot name="left"></slot>
    </div>
    <div class="slot-right col-auto ml-auto text-right form-inline" v-if="!!this.$slots.right || cards || table || search">
      <slot name="right"></slot>

      <div class="ml-2 d-inline-block" v-if="cards" >
        <button class="btn btn-shrink btn-with-icon p-0" style="flex-direction: row;" v-on:click="showAs='cards'" v-bind:class="[ showAs === 'cards' ? 'btn-dark' : 'btn-outline-dark' ]">
          <div class="btn-icon">
            <fa icon="th-large" fixed-width></fa>
          </div>
        </button>
      </div>
      <div class="ml-2 d-inline-block" v-if="table" >
        <button class="btn btn-shrink btn-with-icon p-0" style="flex-direction: row;" v-on:click="showAs='table'" v-bind:class="[ showAs === 'table' ? 'btn-dark' : 'btn-outline-dark' ]">
          <div class="btn-icon">
            <fa icon="th-list" fixed-width></fa>
          </div>
        </button>
      </div>
      <div class="ml-2 d-inline-block" v-if="search">
        <div class="input-group border w-100"
            :class="{'focus-border': isFocused }">
          <div class="input-group-prepend" @click="resetSearch()">
            <div class="input-group-text bg-white border-0">
              <fa icon="search" v-if="!isSearching"></fa>
              <fa icon="times" v-else></fa>
            </div>
          </div>
          <input
            @focus="isFocused = true"
            @blur="isFocused = false"
            v-model="searchString"
            v-on:keyup.enter="$emit('search', searchString); isSearching = searchString.trim().length > 0"
            type="text"
            class="form-control border-0 bg-white"
            placeholder="Search..."/>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from '@vue/composition-api'
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'

interface Props {
  cards?: boolean; table?: boolean; search?: boolean; sidebar: boolean;
}
export default defineComponent({
  components: {
    'font-awesome-layers': FontAwesomeLayers,
    holdButton: () => import('./holdButton.vue'),
  },
  props: {
    cards: Boolean,
    table: Boolean,
    search: Boolean,
    sidebar: Boolean,
  },
  setup(props: Props, context) {
    const searchString = ref('');
    const showAs = ref('cards');
    const isFocused = ref(false);
    const isSearching = ref(false);

    const resetSearch = () => {
      if (isSearching.value) {
        searchString.value = ''
        isSearching.value = false
        context.emit('search', '')
      }
    }

    watch(showAs, (value) => {
      context.emit('showAs', value)
    })

    onMounted(() => {
      if (!!props.cards) showAs.value = 'table'
    })

    return {
      searchString,
      showAs,
      isFocused,
      isSearching,
      resetSearch,
    }
  }
});
</script>

<style scoped>
@media only screen and (max-width: 1000px) {
  .btn-shrink {
    padding: 0!important;
  }
  .btn-shrink .text {
    display: none !important;
  }
  .btn-shrink .btn-icon {
    background: transparent !important;
  }
}

.btn-with-icon {
  padding: 0;
  display: flex;
  flex-direction: row-reverse;
}

.btn-with-icon .text + .btn-icon {
  background: rgba(0,0,0,0.15);
}

.btn-with-icon .btn-icon {
  display: inline-block;
  padding: 0.375rem 0.4rem;
  flex-shrink: 10;
}

.btn-with-icon .text {
  padding: 0.375rem 0.4rem;
}

.slot-left > * {
  margin-right: .5rem;
}

.slot-right > * {
  margin-left: .5rem;
}
</style>
