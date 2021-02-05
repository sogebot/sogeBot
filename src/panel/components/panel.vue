<template>
  <div
    class="border-bottom row py-2 m-0"
    :class="sidebar ? [ 'py-2', 'border-top-0', 'border-gray', 'bg-opaque' ] : ['border-top', 'mb-3']"
  >
    <div
      v-if="!!this.$slots.left"
      class="slot-left col-auto mr-auto d-flex"
      style="height: max-content;"
    >
      <slot name="left" />
    </div>
    <div
      v-if="!!this.$slots.right || cards || table || search"
      class="slot-right col-auto ml-auto text-right form-inline"
    >
      <slot name="right" />

      <div
        v-if="cards"
        class="ml-2 d-inline-block"
      >
        <button
          class="btn btn-shrink btn-with-icon p-0"
          style="flex-direction: row;"
          :class="[ showAs === 'cards' ? 'btn-dark' : 'btn-outline-dark' ]"
          @click="showAs='cards'"
        >
          <div class="btn-icon">
            <fa
              icon="th-large"
              fixed-width
            />
          </div>
        </button>
      </div>
      <div
        v-if="table"
        class="ml-2 d-inline-block"
      >
        <button
          class="btn btn-shrink btn-with-icon p-0"
          style="flex-direction: row;"
          :class="[ showAs === 'table' ? 'btn-dark' : 'btn-outline-dark' ]"
          @click="showAs='table'"
        >
          <div class="btn-icon">
            <fa
              icon="th-list"
              fixed-width
            />
          </div>
        </button>
      </div>
      <div
        v-if="search"
        class="ml-2 d-inline-block"
      >
        <div
          class="input-group border w-100"
          :class="{'focus-border': isFocused }"
        >
          <div
            class="input-group-prepend"
            @click="resetSearch()"
          >
            <div class="input-group-text bg-white border-0">
              <fa
                v-if="!isSearching"
                icon="search"
              />
              <fa
                v-else
                icon="times"
              />
            </div>
          </div>
          <input
            v-model="searchString"
            type="text"
            class="form-control border-0 bg-white"
            placeholder="Search..."
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keyup.enter="$emit('search', searchString); isSearching = searchString.trim().length > 0"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, onMounted, ref, watch,
} from '@vue/composition-api';

interface Props {
  cards?: boolean; table?: boolean; search?: boolean; sidebar: boolean;
}
export default defineComponent({
  props: {
    cards:   Boolean,
    table:   Boolean,
    search:  Boolean,
    sidebar: Boolean,
  },
  setup(props: Props, context) {
    const searchString = ref('');
    const showAs = ref('cards');
    const isFocused = ref(false);
    const isSearching = ref(false);

    const resetSearch = () => {
      if (isSearching.value) {
        searchString.value = '';
        isSearching.value = false;
        context.emit('search', '');
      }
    };

    watch(showAs, (value) => {
      context.emit('showAs', value);
    });

    onMounted(() => {
      if (!!props.cards) {
        showAs.value = 'table';
      }
    });

    return {
      searchString,
      showAs,
      isFocused,
      isSearching,
      resetSearch,
    };
  },
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
