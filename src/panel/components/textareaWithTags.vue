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

    <div v-if="filters && filters.length > 0">
      <b-dropdown id="dropdown-1" variant="dark" class="h-100" :dropleft="true">
        <template v-for="filter of filters">
          <template v-if="filter === 'global'">
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'title'" @click="addVariable('title')"> {{ translate('responses.variable.title') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'game'" @click="addVariable('game')"> {{ translate('responses.variable.game') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'viewers'" @click="addVariable('viewers')"> {{ translate('responses.variable.viewers') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'views'" @click="addVariable('views')"> {{ translate('responses.variable.views') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'hosts'" @click="addVariable('hosts')"> {{ translate('responses.variable.hosts') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'followers'" @click="addVariable('followers')"> {{ translate('responses.variable.followers') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'subscribers'" @click="addVariable('subscribers')"> {{ translate('responses.variable.subscribers') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'spotifySong'" @click="addVariable('spotifySong')"> {{ translate('responses.variable.spotifySong') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'ytSong'" @click="addVariable('ytSong')"> {{ translate('responses.variable.ytSong') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestFollower'" @click="addVariable('latestFollower')"> {{ translate('responses.variable.latestFollower') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestSubscriber'" @click="addVariable('latestSubscriber')"> {{ translate('responses.variable.latestSubscriber') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestTipAmount'" @click="addVariable('latestTipAmount')"> {{ translate('responses.variable.latestTipAmount') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestTipCurrency'" @click="addVariable('latestTipCurrency')"> {{ translate('responses.variable.latestTipCurrency') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestTipMessage'" @click="addVariable('latestTipMessage')"> {{ translate('responses.variable.latestTipMessage') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestTip'" @click="addVariable('latestTip')"> {{ translate('responses.variable.latestTip') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.overall.username'" @click="addVariable('toptip.overall.username')"> {{ translate('responses.variable.toptip.overall.username') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.overall.amount'" @click="addVariable('toptip.overall.amount')"> {{ translate('responses.variable.toptip.overall.amount') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.overall.currency'" @click="addVariable('toptip.overall.currency')"> {{ translate('responses.variable.toptip.overall.currency') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.overall.message'" @click="addVariable('toptip.overall.message')"> {{ translate('responses.variable.toptip.overall.message') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.stream.username'" @click="addVariable('toptip.stream.username')"> {{ translate('responses.variable.toptip.stream.username') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.stream.amount'" @click="addVariable('toptip.stream.amount')"> {{ translate('responses.variable.toptip.stream.amount') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.stream.currency'" @click="addVariable('toptip.stream.currency')"> {{ translate('responses.variable.toptip.stream.currency') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'toptip.stream.message'" @click="addVariable('toptip.stream.message')"> {{ translate('responses.variable.toptip.stream.message') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestCheerAmount'" @click="addVariable('latestCheerAmount')"> {{ translate('responses.variable.latestCheerAmount') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestCheerMessage'" @click="addVariable('latestCheerMessage')"> {{ translate('responses.variable.latestCheerMessage') }} </b-dropdown-item>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter + 'latestCheer'" @click="addVariable('latestCheer')"> {{ translate('responses.variable.latestCheer') }} </b-dropdown-item>
          </template>
          <template v-else>
            <b-dropdown-item class="dropdown-item" style="cursor: pointer" :key="filter" @click="addVariable(filter)"> {{ translate('responses.variable.' + filter) }} </b-dropdown-item>
          </template>
        </template>
        <template slot="button-content">
          <fa icon="dollar-sign" size="lg"/>
        </template>
      </b-dropdown>
    </div>
  </div>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { flattenKeys } from '../../bot/helpers';
import { sortBy, keys, isNil } from 'lodash';
import translate from '../helpers/translate';

import { BDropdown, BDropdownItem } from 'bootstrap-vue/es/components';

const props = Vue.extend({
  props: {
    filters: Array as () => Array<any>,
    value: String,
    error: Boolean,
    placeholder: String,
  },
})

@Component({
  components: { 'b-dropdown': BDropdown, 'b-dropdown-item': BDropdownItem },
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
  height = 0;
  editation = false;
  isMounted = false;
  currentValue = '';
  d_placeholder = !this.placeholder || this.placeholder.trim().length === 0 ? '&nbsp;' : this.placeholder

  get heightStyle() {
    if (this.height === 0) return 'height: auto'
    return `height: ${this.height + 2}px`
  }

  mounted() {
    this.currentValue = this.value;
  }

  onEnter (e) {
    // don't add newline
    e.stopPropagation()
    e.preventDefault()
    e.returnValue = false
    this.currentValue = e.target.value
  }

  addVariable(variable) {
    this.currentValue += ' $' + variable
    this.currentValue = this.currentValue.trim()
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
