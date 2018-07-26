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
  props: ['value', 'command', 'type'],
  methods: {
    update: function () {
      if (this.type === 'number') {
        if (_.isFinite(Number(this.currentValue))) this.currentValue = Number(this.currentValue)
        else this.currentValue = this.value
      }
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

/* textarea input for arrays  */
window.textAreaFromArray = {
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
  template: `
    <div class="input-group">
      <div class="input-group-prepend">
        <span class="input-group-text text-left">
          <span class="d-block">
            {{ title }}
            <small class="d-block">{{ commons.translate('one-record-per-line') }}</small>
          </span>
        </span>
      </div>
      <textarea v-on:keyup="update" v-model="currentValue" class="form-control" type="text"></textarea>
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
      return !this.placeholder || this.placeholder.trim().length === 0 ? '&nbsp;' : this.placeholder
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

/* wheel of fortune responses settings */
window.wofTextArea = {
  props: ['value', 'placeholder', 'rid', 'oid'],
  watch: {
    currentValue: function (val) {
      const data = { option: this.oid, response: this.rid, value: val }
      console.debug('[WOF] Updating response', data)
      this.$emit('update', { oid: this.oid, rid: this.rid, value: val })
    },
    editation: function (val, old) {
      if (val) {
        // focus textarea and set height
        this.height = this.$refs.div.clientHeight
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
    valueWithHTML: function () {
      if (this.currentValue.trim().length === 0) {
        return `<span class="text-muted">${this.placeholder}</span>`
      } else {
        const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(translations.responses.variable), (o) => -o.length).join('|') + ')', 'g')
        let matches = this.currentValue.match(filtersRegExp)
        let output = this.currentValue
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
    heightStyle: function () {
      if (this.height === 0) return 'height: auto'
      return `height: ${this.height + 2}px`
    }
  },
  data: function () {
    return {
      currentValue: this.value,
      height: 0,
      editation: false
    }
  },
  template: `
    <div style="flex: 1 1 auto;">
      <textarea v-on:blur="editation = false" v-show="editation" ref="textarea" v-model="currentValue" v-bind:placeholder="placeholder" class="form-control" v-bind:style="heightStyle"></textarea>
      <div class="form-control" ref="div" style="cursor: text; overflow: auto; resize: vertical;"
        v-show="!editation"
        v-on:click="editation=true"
        v-bind:style="heightStyle"
        v-html="valueWithHTML">
      </div>
    </div>
    `
}

window.wofResponses = {
  props: ['options'],
  data: function () {
    return {
      w_options: this.options
    }
  },
  components: {
    'textarea-with-tags': window.wofTextArea
  },
  watch: {
    w_options: function (val, old) {
      console.log('[WOF] emitting options changes', val)
      this.$emit('update', this.w_options)
    }
  },
  methods: {
    updateOption: function (index, value) {
      let option = this.w_options[index]
      option.title = value
      Vue.set(this.w_options, index, option)
    },
    addOption: function () {
      this.w_options.push({ title: '', responses: [''] })
    },
    removeOption: function (index) {
      this.w_options.splice(index, 1)
    },
    addResponse: function (oid) {
      this.w_options[oid].responses.push('')
    },
    updateResponse: function (opts) {
      let option = this.w_options[opts.oid]
      option.responses[opts.rid] = opts.value
      Vue.set(this.w_options, opts.oid, option)
    },
    removeResponse: function (oid, rid) {
      let option = this.w_options[oid]
      option.responses.splice(rid, 1)
      Vue.set(this.w_options, oid, option)
    }
  },
  template: `
    <div>
      <div v-if="w_options.length === 0" class="alert alert-info">
        {{ commons.translate('games.wheeloffortune.noOptionsFound') }}
      </div>
      <template v-for="(option, index) of w_options">
        <div class="input-group" v-bind:class="{ 'pt-4': index > 0 }">
          <div class="input-group-prepend">
            <span class="input-group-text">{{ commons.translate('games.wheeloffortune.title.name') }}</span>
          </div>
          <input class="form-control"
            v-bind:placeholder="commons.translate('games.wheeloffortune.title.placeholder')"
            v-model="option.title"
            v-on:input="updateOption(index, option.title)">
          <button v-on:click="removeOption(index)" class="btn btn-danger btn-sm"><i class="fas fa-minus"></i> {{ commons.translate('games.wheeloffortune.remove.option') }}</button>
        </div>
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text d-block text-left">
              <div>{{ commons.translate('games.wheeloffortune.responses.name') }}</div>
              <small>{{ commons.translate('games.wheeloffortune.responses.help') }}</small>
            </span>
          </div>
          <div class="form-control p-0 border-0">
            <template v-if="option.responses.length > 1" v-for="(response, index2) of option.responses">
              <div class="d-flex">
                <textarea-with-tags
                  v-bind:placeholder="commons.translate('games.wheeloffortune.responses.placeholder')"
                  v-bind:value="response"
                  v-bind:rid="index2"
                  v-bind:oid="index"
                  v-on:update="updateResponse"></textarea-with-tags>
                <div class="input-group-append">
                  <button v-on:click="removeResponse(index, index2)" class="btn btn-danger btn-sm"><i class="fas fa-minus"></i> {{ commons.translate('games.wheeloffortune.remove.response') }}</button>
                </div>
              </div>
            </template>
            <template v-if="option.responses.length <= 1">
                <textarea-with-tags
                  v-bind:placeholder="commons.translate('games.wheeloffortune.responses.placeholder')"
                  v-bind:value="option.responses[0]"
                  rid="0"
                  v-bind:oid="index"
                  v-on:update="updateResponse"></textarea-with-tags>
            </template>
            <button v-on:click="addResponse(index)" class="btn btn-success btn-block btn-sm"><i class="fas fa-plus"></i></button>
          </div>
        </div>
      </template>
      <button v-on:click="addOption" class="btn btn-success btn-block mt-3"><i class="fas fa-plus"></i> {{ commons.translate('games.wheeloffortune.addOption') }}</button>
    </div>
    `
}
