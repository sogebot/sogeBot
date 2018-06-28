/* globals translations, commons, Vue, _ */

/* div with html filters */
window.textWithTags = {
  props: ['value'],
  filters: {
    filterize: function (val) {
      const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(translations.responses.variable), (o) => -o.length).join('|') + ')', 'g')
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      let matches = val.match(filtersRegExp)
      let output = val
      if (!_.isNil(matches)) {
        for (let match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${commons.translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`)
        }
      }
      return output
    }
  },
  template: `
    <div style="flex: 1 1 auto;" v-html="$options.filters.filterize(value)"></div>
    `
}

/* command input for settings  */
window.commandInput = {
  props: ['value', 'command'],
  methods: {
    update: function () {
      this.$emit('update', this.currentValue)
    }
  },
  data: function () {
    return {
      currentValue: this.value
    }
  },
  template: `
    <div class="input-group">
      <div class="input-group-prepend">
        <span class="input-group-text">{{ command }}</span>
      </div>
      <input v-on:keyup="update" v-model="currentValue" class="form-control" type="text" />
    </div>`
}

/* simple enable/disable button toggler */
window.toggleEnable = {
  props: ['value', 'title'],
  methods: {
    update: function () {
      this.$emit('update', !this.value)
    }
  },
  template: `
    <div class="input-group">
      <div v-if="title" class="input-group-prepend">
        <span class="input-group-text">{{ title }}</span>
      </div>
      <button
        class="btn form-control"
        v-bind:class="{'btn-success': this.value, 'btn-danger': !this.value}"
        v-on:click="update()">
        <template v-if="this.value">{{ commons.translate('enabled') }}</template>
        <template v-else>{{ commons.translate('disabled') }}</template>
      </button>
    </div>
  `
}

/* textarea with editation */
window.textAreaWithTags = {
  props: ['value', 'placeholder', 'error'],
  watch: {
    editation: function (val, old) {
      if (val) {
        // focus textarea and set height
        if (this.currentValue.trim().length === 0) {
          this.height = this.$refs.placeholder.clientHeight
        } else this.height = this.$refs.div.clientHeight
        Vue.nextTick(() => {
          this.$refs.textarea.focus()
        })
      } else {
        // texteare unfocused, set height of div
        this.height = this.$refs.textarea.clientHeight
      }
    }
  },
  computed: {
    _placeholder: function () {
      return !this.placeholder || this.placeholer.trim().length === 0 ? '&nbsp;' : this.placeholder
    },
    currentValue: {
      get: function () {
        return this.value
      },
      set: function (newValue) {
        this.$emit('update', newValue)
      }
    },
    heightStyle: function () {
      if (this.height === 0) return 'height: auto'
      return `height: ${this.height + 2}px`
    }
  },
  filters: {
    filterize: function (val) {
      const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(translations.responses.variable), (o) => -o.length).join('|') + ')', 'g')
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      let matches = val.match(filtersRegExp)
      let output = val
      if (!_.isNil(matches)) {
        for (let match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${commons.translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`)
        }
      }
      return output
    }
  },
  methods: {
    onEnter (e) {
      // don't add newline
      e.stopPropagation()
      e.preventDefault()
      e.returnValue = false
      this.input = e.target.value
    }
  },
  data: function () {
    return {
      height: 0,
      editation: false
    }
  },
  template: `
    <div style="flex: 1 1 auto;"
      class="form-control border-0 p-0 m-0"
      v-bind:class="{ 'is-invalid': error }">
      <textarea v-on:keydown.enter="onEnter" v-on:blur="editation = false" v-show="editation" ref="textarea" v-model="currentValue" v-bind:placeholder="placeholder" class="form-control" v-bind:style="heightStyle"></textarea>
      <div class="form-control" ref="placeholder" style="cursor: text; overflow: auto; resize: vertical;"
        v-bind:class="{ 'is-invalid': error }"
        v-show="!editation && value.trim().length === 0"
        v-bind:style="heightStyle"
        v-on:click="editation=true"><span class="text-muted" v-html="_placeholder"></span></div>
      <div class="form-control" ref="div" style="cursor: text; overflow: auto; resize: vertical;"
        v-bind:class="{ 'is-invalid': error }"
        v-show="!editation && value.trim().length > 0"
        v-on:click="editation=true"
        v-bind:style="heightStyle"
        v-html="$options.filters.filterize(value)">
      </div>
    </div>
    `
}
