<template>
  <div style="flex: 1 1 auto; height: fit-content; height: -moz-fit-content;"
    class="border-0 p-0 m-0 d-flex"
    v-bind:class="{ 'is-invalid': error }">

    <textarea style="min-height: 6em;" v-show="editation" v-on:keydown.enter="onEnter" v-on:blur="editation = false" ref="textarea" v-model="currentValue" v-bind:placeholder="placeholder" class="form-control" v-bind:style="heightStyle"></textarea>

    <div class="form-control" ref="placeholder" style="cursor: text; overflow: auto; resize: vertical; min-height: 6em;"
      v-bind:class="{ 'is-invalid': error }"
      v-show="!editation && value.trim().length === 0"
      v-bind:style="heightStyle"
      v-on:click="editation=true"><span class="text-muted" v-html="d_placeholder"></span>
    </div>

    <div class="form-control" ref="div" style="word-break: break-all; cursor: text; overflow: auto; resize: vertical; min-height: 6em;"
      v-bind:class="{ 'is-invalid': error }"
      v-show="!editation && value.trim().length > 0"
      v-on:click="editation=true"
      v-bind:style="heightStyle"
      v-html="$options.filters.filterize(value)">
    </div>

    <div v-if="filters && filters.length > 0"
         @mouseleave="isFiltersVisible=false">
      <button type="button"
              class="btn btn-dark pl-3 pt-3 h-100"
              :class="[ isFiltersVisible ? 'btn-secondary' : 'btn-outline-secondary' ]"
              @click="toggleFilters()">
        <fa icon="dollar-sign" size="lg"/>
      </button>

      <div class="border bg-light ml-3 mb-3 mr-3" v-show="isFiltersVisible">
        <template v-for="filter of filters">
          <div v-if="filter === 'global'" :key="filter">
            <span class="editable-variable block" @click="addVariable('title')"> {{ translate('responses.variable.title') }} </span>
            <span class="editable-variable block" @click="addVariable('game')"> {{ translate('responses.variable.game') }} </span>
            <span class="editable-variable block" @click="addVariable('viewers')"> {{ translate('responses.variable.viewers') }} </span>
            <span class="editable-variable block" @click="addVariable('views')"> {{ translate('responses.variable.views') }} </span>
            <span class="editable-variable block" @click="addVariable('hosts')"> {{ translate('responses.variable.hosts') }} </span>
            <span class="editable-variable block" @click="addVariable('followers')"> {{ translate('responses.variable.followers') }} </span>
            <span class="editable-variable block" @click="addVariable('subscribers')"> {{ translate('responses.variable.subscribers') }} </span>
            <span class="editable-variable block" @click="addVariable('spotifySong')"> {{ translate('responses.variable.spotifySong') }} </span>
            <span class="editable-variable block" @click="addVariable('ytSong')"> {{ translate('responses.variable.ytSong') }} </span>
            <span class="editable-variable block" @click="addVariable('latestFollower')"> {{ translate('responses.variable.latestFollower') }} </span>
            <span class="editable-variable block" @click="addVariable('latestSubscriber')"> {{ translate('responses.variable.latestSubscriber') }} </span>
            <span class="editable-variable block" @click="addVariable('latestTipAmount')"> {{ translate('responses.variable.latestTipAmount') }} </span>
            <span class="editable-variable block" @click="addVariable('latestTipCurrency')"> {{ translate('responses.variable.latestTipCurrency') }} </span>
            <span class="editable-variable block" @click="addVariable('latestTipMessage')"> {{ translate('responses.variable.latestTipMessage') }} </span>
            <span class="editable-variable block" @click="addVariable('latestTip')"> {{ translate('responses.variable.latestTip') }} </span>
            <span class="editable-variable block" @click="addVariable('latestCheerAmount')"> {{ translate('responses.variable.latestCheerAmount') }} </span>
            <span class="editable-variable block" @click="addVariable('latestCheerMessage')"> {{ translate('responses.variable.latestCheerMessage') }} </span>
            <span class="editable-variable block" @click="addVariable('latestCheer')"> {{ translate('responses.variable.latestCheer') }} </span>
          </div>
          <div v-else :key="filter">
            <span class="editable-variable block" @click="addVariable(filter)"> {{ translate('responses.variable.' + filter) }} </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { flattenKeys } from '../../bot/helpers';
import { sortBy, keys, isNil } from 'lodash';
import translate from '../helpers/translate';

const props = Vue.extend({
  props: {
    filters: [],
    value: String,
    error: Boolean,
    placeholder: String,
  },
})

@Component({
  filters: {
    filterize: function (val) {
      const filtersRegExp = new RegExp('\\$(' + sortBy(keys(flattenKeys(translate('responses.variable'))), (o) => -o.length).join('|') + ')', 'g')
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      let matches = val.match(filtersRegExp)
      let output = val
      if (!isNil(matches)) {
        for (let match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`)
        }
      }
      return output
    }
  }
})
export default class textareaWithTags extends props {
  timeout = 0;
  height = 0;
  isFiltersVisible = false;
  editation = false;
  isMounted = false;
  btnPosX = 0;
  btnPosY = 0;
  currentValue = '';
  d_placeholder = !this.placeholder || this.placeholder.trim().length === 0 ? '&nbsp;' : this.placeholder

  get heightStyle() {
    if (this.height === 0) return 'height: auto'
    return `height: ${this.height + 2}px`
  }

  mounted() {
    this.currentValue = this.value;
    this.timeout = window.setInterval(() => {
      this.updateFilterBtnPosX();
      this.updateFilterBtnPosY();
    }, 100)
  }

  destroyed() {
    clearInterval(this.timeout)
  }

  updateFilterBtnPosX() {
    Vue.nextTick(() => {
      let client: null | DOMRect | ClientRect = null
      if (typeof this.$refs.textarea === 'undefined') return

      if (this.editation) {
        client = (<HTMLElement>this.$refs.textarea).getBoundingClientRect()
      } else {
        if (this.currentValue.trim().length === 0) {
          client = (<HTMLElement>this.$refs.placeholder).getBoundingClientRect()
        } else {
          client = (<HTMLElement>this.$refs.div).getBoundingClientRect()
        }
      }
      this.btnPosX = (<DOMRect>client).x + client.width - 50;
    })
  }

  updateFilterBtnPosY() {
    Vue.nextTick(() => {
      let client: null | DOMRect | ClientRect = null
      if (typeof this.$refs.textarea === 'undefined') return

      if (this.editation) {
        client = (<HTMLElement>this.$refs.textarea).getBoundingClientRect()
      } else {
        if (this.currentValue.trim().length === 0) {
          client = (<HTMLElement>this.$refs.placeholder).getBoundingClientRect()
        } else {
          client = (<HTMLElement>this.$refs.div).getBoundingClientRect()
        }
      }
      this.btnPosY = (<DOMRect>client).y + client.height - 47;
    })
  }

  onEnter (e) {
    // don't add newline
    e.stopPropagation()
    e.preventDefault()
    e.returnValue = false
    this.currentValue = e.target.value
  }

  addVariable(variable) {
    this.currentValue += '$' + variable
    this.editation = true;
    Vue.nextTick(() => {
      (<HTMLElement>this.$refs.textarea).focus()
    })
  }

  toggleFilters() {
    this.isFiltersVisible = !this.isFiltersVisible;
    this.editation = true;
    Vue.nextTick(() => {
      (<HTMLElement>this.$refs.textarea).focus()
    })
  }

  @Watch('currentValue')
  onCurrentValueChanged(val: string, oldVal: string) {
    this.$emit('change', val)
  }

  @Watch('editation')
  onEditationChanged(val, old) {
      if (val) {
        // focus textarea and set height
        if (this.currentValue.trim().length === 0) {
          this.height = (<HTMLElement>this.$refs.placeholder).clientHeight
        } else this.height = (<HTMLElement>this.$refs.div).clientHeight
        Vue.nextTick(() => {
          (<HTMLElement>this.$refs.textarea).focus()
        })
      } else {
        // texteare unfocused, set height of div
        this.height = (<HTMLElement>this.$refs.textarea).clientHeight
      }
    }
}
</script>
