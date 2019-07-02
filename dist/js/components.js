/* globals translations, commons, Vue, _ $, io  */

const flattenKeys = (obj, path = []) =>
    !_.isObject(obj)
        ? { [path.join('.')]: obj }
        : _.reduce(obj, (cum, next, key) => _.merge(cum, flattenKeys(next, [...path, key])), {});

/* div with html filters */
window.textWithTags = {
  props: ['value'],
  filters: {
    filterize: function (val) {
      const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(flattenKeys(translations.responses.variable)), (o) => -o.length).join('|') + ')', 'g')
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

/* number input for settings  */
window.numberInput = {
  props: ['value', 'title', 'readonly', 'min', 'max', 'step'],
  methods: {
    update: function () {
      let step = String(this.step || 0)

      if (step.includes('.')) {
        step = step.split('.')[1].length
      }

      this.currentValue = Number(Number(this.currentValue).toFixed(step))
      if (typeof this.min !== 'undefined' && this.min > this.currentValue) this.currentValue = this.min
      if (typeof this.max !== 'undefined' && this.max < this.currentValue) this.currentValue = this.max

      this.$emit('update', { value: Number(this.currentValue) })
    }
  },
  data: function () {
    return {
      show: false,
      currentValue: this.value,
      translatedTitle: commons.translate(this.title)
    }
  },
  mounted: function () {
    $('.textInputTooltip').tooltip()
  },
  template: `
    <div class="input-group">
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
          <template v-else>
            {{ translatedTitle.title }}
            <small class="textInputTooltip text-info pl-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
          </template>
        </span>
      </div>
      <input :min="min" :max="max" v-on:keyup="update" @focus="show = true" @blur="show = false" v-model="currentValue" :step="step || 1" type="number" class="form-control" :readonly="readonly" />
    </div>`
}

/* text input for settings  */
window.textInput = {
  props: ['value', 'title', 'type', 'readonly', 'secret'],
  methods: {
    update: function () {
      if (this.type === 'number') {
        if (_.isFinite(Number(this.currentValue))) this.currentValue = Number(this.currentValue)
        else this.currentValue = this.value
      }
      this.$emit('update', { value: this.currentValue })
    }
  },
  data: function () {
    return {
      show: false,
      currentValue: this.value,
      translatedTitle: commons.translate(this.title)
    }
  },
  mounted: function () {
    $('.textInputTooltip').tooltip()
  },
  template: `
    <div class="input-group">
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
          <template v-else-if="typeof translatedTitle === 'object'">
            {{ translatedTitle.title }}
            <small style="cursor: help;" class="textInputTooltip text-info ml-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
          </template>
        </span>
      </div>
      <input v-on:keyup="update" @focus="show = true" @blur="show = false" v-model="currentValue" class="form-control" :type="secret && !show ? 'password' : 'text'" :readonly="readonly" />
    </div>`
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

/* command input for settings with permissions  */
window.commandInputWithPermissions = {
  props: ['value', 'command', 'type', 'permissions', 'token'],
  watch: {
    currentPermissions: function () { this.update() }
  },
  methods: {
    update: function () {
      if (this.type === 'number') {
        if (_.isFinite(Number(this.currentValue))) this.currentValue = Number(this.currentValue)
        else this.currentValue = this.value
      }
      this.$emit('update', { value: this.currentValue, permissions: this.currentPermissions })
    },
    getPermissionName: function (id) {
      if (!id) return 'Disabled'
      const permission = this.permissionsList.find((o) => {
        return o.id === id
      })
      if (typeof permission !== 'undefined') {
        if (permission.name.trim() === '') {
          return permission.id
        } else {
          return permission.name
        }
      } else {
        return null
      }
    }
  },
  data: function () {
    return {
      socket: io('/core/permissions', { query: "token=" + this.token }),
      currentValue: this.value,
      currentPermissions: this.permissions,
      permissionsList: [],
      permissionsLoaded: false,
    }
  },
  mounted() {
    this.socket.emit('find', {}, (err, data) => {
      if (err) return console.error(err)
      this.permissionsList = _.orderBy(data, 'order', 'asc');
      this.permissionsLoaded = true
    })
  },
  template: `
    <div class="input-group">
      <div class="input-group-prepend">
        <span class="input-group-text">{{ command }}</span>
      </div>
      <input v-on:keyup="update" v-model="currentValue" class="form-control" type="text" />
      <div v-if="!permissionsLoaded" class="input-group-append">
        <div class="spinner-grow spinner-grow-sm" role="status">
          <span class="sr-only">Loading...</span>
        </div>
      </div>
      <div class="input-group-append" v-else>
        <div class="dropdown">
          <button class="btn dropdown-toggle" type="button" id="dropdownMenuButton" data-toggle="dropdown"
                  :class="{'btn-light': currentPermissions === null, 'btn-dark': currentPermissions !== null && getPermissionName(currentPermissions) !== null, 'btn-danger': currentPermissions !== null && getPermissionName(currentPermissions) === null}">
            <template v-if="permissionsLoaded">
              <span v-if="getPermissionName(currentPermissions) !== null">{{ getPermissionName(currentPermissions) }}</span>
              <span v-else>
                <i class="fas fa-exclamation-triangle"></i> Permission not found
              </span>
            </template>
            <div v-else class="spinner-grow spinner-grow-sm" role="status">
              <span class="sr-only">Loading...</span>
            </div>
          </button>
          <div class="dropdown-menu" aria-labelledby="dropdownMenuButton" style="z-index: 9999;">
            <button
              v-if="permissionsLoaded"
              v-for="p of permissionsList"
              class="dropdown-item"
              @click="currentPermissions = p.id"
            >{{getPermissionName(p.id)}}</button>
            <button
              v-if="permissionsLoaded"
              class="dropdown-item"
              @click="currentPermissions = null"
            >Disabled</button>
          </div>
        </div>
      </div>
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
        <span class="input-group-text">
          <template v-if="typeof title === 'string'">{{ title }}</template>
          <template v-else>
            {{ title.title }}
            <small class="textInputTooltip text-info pl-1" data-toggle="tooltip" data-html="true" :title="title.help">[?]</small>
          </template>
        </span>
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
  props: ['value', 'placeholder', 'error', 'filters'],
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
    },
  },
  mounted() {
    this.timeout = setInterval(() => {
      this.updateFilterBtnPosX();
      this.updateFilterBtnPosY();
    }, 100)
  },
  destroyed() {
    clearInterval(this.timeout)
  },
  filters: {
    filterize: function (val) {
      const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(flattenKeys(translations.responses.variable)), (o) => -o.length).join('|') + ')', 'g')
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
    updateFilterBtnPosX() {
      Vue.nextTick(() => {
        let client = null

        if (this.editation) {
          client = this.$refs.textarea.getBoundingClientRect()
        } else {
          if (this.currentValue.trim().length === 0) {
            client = this.$refs.placeholder.getBoundingClientRect()
          } else {
            client = this.$refs.div.getBoundingClientRect()
          }
        }
        this.btnPosX = client.x + client.width - 50;
      })
    },
    updateFilterBtnPosY() {
      Vue.nextTick(() => {
        let client = null

        if (this.editation) {
          client = this.$refs.textarea.getBoundingClientRect()
        } else {
          if (this.currentValue.trim().length === 0) {
            client = this.$refs.placeholder.getBoundingClientRect()
          } else {
            client = this.$refs.div.getBoundingClientRect()
          }
        }
        this.btnPosY = client.y + client.height - 47;
      })
    },
    onEnter (e) {
      // don't add newline
      e.stopPropagation()
      e.preventDefault()
      e.returnValue = false
      this.input = e.target.value
    },
    addVariable(variable) {
      this.currentValue += '$' + variable
      this.editation = true;
      Vue.nextTick(() => {
        this.$refs.textarea.focus()
      })
    },
    toggleFilters() {
      this.isFiltersVisible = !this.isFiltersVisible;
      this.editation = true;
      Vue.nextTick(() => {
        this.$refs.textarea.focus()
      })
    },
  },
  data: function () {
    return {
      height: 0,
      isFiltersVisible: false,
      editation: false,
      isMounted: false,
      btnPosX: 0,
      btnPosY: 0,
      timeout: null,
    }
  },
  template: `
    <div style="flex: 1 1 auto;"
      class="form-control border-0 p-0 m-0"
      style="height: fit-content; height: -moz-fit-content;"
      v-bind:class="{ 'is-invalid': error }">

      <textarea style="min-height: 5em;" v-show="editation" v-on:keydown.enter="onEnter" v-on:blur="editation = false" ref="textarea" v-model="currentValue" v-bind:placeholder="placeholder" class="form-control" v-bind:style="heightStyle"></textarea>

      <div class="form-control" ref="placeholder" style="cursor: text; overflow: auto; resize: vertical; min-height: 5em;"
        v-bind:class="{ 'is-invalid': error }"
        v-show="!editation && value.trim().length === 0"
        v-bind:style="heightStyle"
        v-on:click="editation=true"><span class="text-muted" v-html="_placeholder"></span>
      </div>

      <div class="form-control" ref="div" style="word-break: break-all; cursor: text; overflow: auto; resize: vertical; min-height: 5em;"
        v-bind:class="{ 'is-invalid': error }"
        v-show="!editation && value.trim().length > 0"
        v-on:click="editation=true"
        v-bind:style="heightStyle"
        v-html="$options.filters.filterize(value)">
      </div>

      <div v-if="filters && filters.length > 0"
           style="position: fixed; z-index: 9999"
           :style="{ left: btnPosX + 'px', top: btnPosY + 'px' }"
           @mouseleave="isFiltersVisible=false">
        <button type="button"
                class="btn btn-sm border-0 ml-3 mt-3"
                :class="[ isFiltersVisible ? 'btn-secondary' : 'btn-outline-secondary' ]"
                @click="toggleFilters()">$</button>

        <div class="border bg-light ml-3 mb-3 mr-3" v-show="isFiltersVisible">
          <template v-for="filter of filters">
            <div v-if="filter === 'global'">
              <span class="editable-variable block" @click="addVariable('title')"> {{ commons.translate('responses.variable.title') }} </span>
              <span class="editable-variable block" @click="addVariable('game')"> {{ commons.translate('responses.variable.game') }} </span>
              <span class="editable-variable block" @click="addVariable('viewers')"> {{ commons.translate('responses.variable.viewers') }} </span>
              <span class="editable-variable block" @click="addVariable('views')"> {{ commons.translate('responses.variable.views') }} </span>
              <span class="editable-variable block" @click="addVariable('hosts')"> {{ commons.translate('responses.variable.hosts') }} </span>
              <span class="editable-variable block" @click="addVariable('followers')"> {{ commons.translate('responses.variable.followers') }} </span>
              <span class="editable-variable block" @click="addVariable('subscribers')"> {{ commons.translate('responses.variable.subscribers') }} </span>
              <span class="editable-variable block" @click="addVariable('spotifySong')"> {{ commons.translate('responses.variable.spotifySong') }} </span>
              <span class="editable-variable block" @click="addVariable('ytSong')"> {{ commons.translate('responses.variable.ytSong') }} </span>
              <span class="editable-variable block" @click="addVariable('latestFollower')"> {{ commons.translate('responses.variable.latestFollower') }} </span>
              <span class="editable-variable block" @click="addVariable('latestSubscriber')"> {{ commons.translate('responses.variable.latestSubscriber') }} </span>
              <span class="editable-variable block" @click="addVariable('latestTipAmount')"> {{ commons.translate('responses.variable.latestTipAmount') }} </span>
              <span class="editable-variable block" @click="addVariable('latestTipCurrency')"> {{ commons.translate('responses.variable.latestTipCurrency') }} </span>
              <span class="editable-variable block" @click="addVariable('latestTipMessage')"> {{ commons.translate('responses.variable.latestTipMessage') }} </span>
              <span class="editable-variable block" @click="addVariable('latestTip')"> {{ commons.translate('responses.variable.latestTip') }} </span>
              <span class="editable-variable block" @click="addVariable('toptip.overall.username')"> {{ commons.translate('responses.variable.toptip.overall.username') }}</span>
              <span class="editable-variable block" @click="addVariable('toptip.overall.amount')"> {{ commons.translate('responses.variable.toptip.overall.amount') }}</span>
              <span class="editable-variable block" @click="addVariable('toptip.overall.currency')"> {{ commons.translate('responses.variable.toptip.overall.currency') }}</span>
              <span class="editable-variable block" @click="addVariable('toptip.overall.message')"> {{ commons.translate('responses.variable.toptip.overall.message') }}</span>
              <span class="editable-variable block" @click="addVariable('toptip.stream.username')"> {{ commons.translate('responses.variable.toptip.stream.username') }}</span>
              <span class="editable-variable block" @click="addVariable('toptip.stream.amount')"> {{ commons.translate('responses.variable.toptip.stream.amount') }}</span>
              <span class="editable-variable block" @click="addVariable('toptip.stream.currency')"> {{ commons.translate('responses.variable.toptip.stream.currency') }}</span>
              <span class="editable-variable block" @click="addVariable('toptip.stream.message')"> {{ commons.translate('responses.variable.toptip.stream.message') }}</span>
              <span class="editable-variable block" @click="addVariable('latestCheerAmount')"> {{ commons.translate('responses.variable.latestCheerAmount') }} </span>
              <span class="editable-variable block" @click="addVariable('latestCheerMessage')"> {{ commons.translate('responses.variable.latestCheerMessage') }} </span>
              <span class="editable-variable block" @click="addVariable('latestCheer')"> {{ commons.translate('responses.variable.latestCheer') }} </span>
            </div>
            <div v-else>
            <span class="editable-variable block" @click="addVariable(filter)"> {{ commons.translate('responses.variable.' + filter) }} </span>
          </template>
        </div>
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
    <div style="flex: 1 1 auto; height: fit-content">
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
        <div class="input-group" style="height: fit-content" v-bind:class="{ 'pt-4': index > 0 }">
          <div class="input-group-prepend">
            <span class="input-group-text">{{ commons.translate('games.wheeloffortune.title.name') }}</span>
          </div>
          <input class="form-control"
            v-bind:placeholder="commons.translate('games.wheeloffortune.title.placeholder')"
            v-model="option.title"
            v-on:input="updateOption(index, option.title)">
          <button v-on:click="removeOption(index)" class="btn btn-danger btn-sm"><i class="fas fa-minus"></i> {{ commons.translate('games.wheeloffortune.remove.option') }}</button>
        </div>
        <div class="input-group" style="height: fit-content">
          <div class="input-group-prepend">
            <span class="input-group-text d-block text-left">
              <div>{{ commons.translate('games.wheeloffortune.responses.name') }}</div>
              <small>{{ commons.translate('games.wheeloffortune.responses.help') }}</small>
            </span>
          </div>
          <div class="form-control p-0 border-0" style="height: fit-content">
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

/* heist levels */
window.heistLevels = {
  props: ['levels'],
  data: function () {
    return {
      w_levels: this.levels.sort((a, b) => {
        return a.maxUsers - b.maxUsers
      })
    }
  },
  watch: {
    w_levels: function (val, old) {
      this.update()
    }
  },
  methods: {
    update: function () {
      console.log('[HEIST] emitting levels changes', this.w_levels)
      this.$emit('update', this.w_levels)
    },
    addLevel: function () {
      this.w_levels.push({
        name: '',
        winPercentage: 10,
        payoutMultiplier: 1,
        maxUsers: 10
      })
    },
    removeLevel: function (index) {
      this.w_levels.splice(index, 1)
    }
  },
  template: `
    <div>
      <div v-if="w_levels.length === 0" class="alert alert-info">
        {{ commons.translate('games.heist.noLevelsFound') }}
      </div>
      <template v-for="(level, index) of w_levels">
        <div class="row" :class="{'mt-3' : index > 0}">
          <div class="col-11">
            <div class="input-group">
              <span class="input-group-text">{{commons.translate('games.heist.name')}}</span>
              <input type="text" v-model="level.name" class='form-control' @keydown="update" @change="update">
            </div>
            <div class="input-group mt-1">
              <span class="input-group-text">{{commons.translate('games.heist.winPercentage')}}</span>
              <input type="number" min="1" v-model="level.winPercentage" class='form-control' @keydown="update" @change="update">
            </div>
            <div class="input-group mt-1">
              <span class="input-group-text">{{commons.translate('games.heist.payoutMultiplier')}}</span>
              <input type="number" min="1" step="0.1" v-model="level.payoutMultiplier" class='form-control' @keydown="update" @change="update">
            </div>
            <div class="input-group mt-1">
              <span class="input-group-text">{{commons.translate('games.heist.maxUsers')}}</span>
              <input type="number" min="1" v-model="level.maxUsers" class='form-control' @keydown="update" @change="update">
            </div>
          </div>

          <div class="col-1 pl-0">
            <button class="btn btn-danger h-100 w-100" @click="removeLevel(index)"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </template>
      <button class="btn btn-success btn-block mt-2" @click="addLevel"><i class="fas fa-plus"></i></button>
    </div>
  `
}

/* heist results */
window.heistResults = {
  props: ['results'],
  data: function () {
    return {
      w_results: this.results.sort((a, b) => {
        return a.percentage - b.percentage
      })
    }
  },
  watch: {
    w_results: function (val, old) {
      this.update()
    }
  },
  methods: {
    update: function () {
      console.log('[HEIST] emitting results changes', this.w_results)
      this.$emit('update', this.w_results)
    },
    addResult: function () {
      this.w_results.push({
        percentage: 10,
        message: ''
      })
    },
    removeResult: function (index) {
      this.w_results.splice(index, 1)
    }
  },
  template: `
    <div class="mt-3">
      <div v-if="w_results.length === 0" class="alert alert-info">
        {{ commons.translate('games.heist.noResultsFound') }}
      </div>
      <template v-for="(result, index) of w_results">
        <div class="row" :class="{'mt-3' : index > 0}">
          <div class="col-11">
            <div class="input-group">
              <span class="input-group-text">{{commons.translate('games.heist.message')}}</span>
              <input type="text" v-model="result.message" class='form-control' @keydown="update" @change="update">
            </div>
            <div class="input-group mt-1">
              <span class="input-group-text">{{commons.translate('games.heist.percentage')}}</span>
              <input type="number" min="1" v-model="result.percentage" class='form-control' @keydown="update" @change="update">
            </div>
          </div>

          <div class="col-1 pl-0">
            <button class="btn btn-danger h-100 w-100" @click="removeResult(index)"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </template>
      <button class="btn btn-success btn-block mt-2" @click="addResult"><i class="fas fa-plus"></i></button>
    </div>
  `
}

/* checklist */
window.checkList = {
  props: ['current', 'value', 'title'],
  data: function () {
    return {
      show: false,
      currentValue: this.value,
      translatedTitle: commons.translate(this.title)
    }
  },
  template: `
    <div class="d-flex">
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
          <template v-else>
            {{ translatedTitle.title }}
            <small class="textInputTooltip text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
          </template>
        </span>
      </div>
      <ul class="list-group list-group-flush w-100 border border-input">
        <li class="list-group-item border-0" v-for='v of value' :class="[current.includes(v) ? 'list-group-item-success' : 'list-group-item-danger']">{{ v }}</li>
      </ul>
    </div>
  `
}

/* selector */
window.selector = {
  props: ['readonly', 'value', 'title', 'current', 'values'],
  data: function () {
    return {
      currentValue: this.value,
      translatedTitle: commons.translate(this.title)
    }
  },
  methods: {
    onChange: function () {
      this.$emit('update', { value: this.currentValue })
    }
  },
  template: `
    <div class="d-flex">
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
          <template v-else>
            {{ translatedTitle.title }}
            <small class="textInputTooltip text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
          </template>
        </span>
      </div>
      <select class="form-control" :readonly="readonly" v-model="currentValue" v-on:change="onChange">
        <option v-for="v of values">{{v}}</option>
      </select>
    </div>
    `
}

/* hold button */
window.holdButton = {
  props: ['holdtitle', 'title', 'ttc', 'icon'],
  data: function () {
    return {
      onMouseDownStarted: 0,
      isMouseOver: false,
      trigger: false,
      percentage: 0,
      intervals: []
    }
  },
  watch: {
    trigger: function (val) {
      if (val) {
        this.$emit('trigger')
      }
    },
    isMouseOver: function (val) {
      if (!val) {
        this.onMouseDownStarted = 0
        this.trigger = false
        this.percentage = 0
      }
    }
  },
  destroyed: function () {
    for (let i of this.intervals) clearInterval(i)
  },
  mounted: function () {
    this.intervals.push(setInterval(() => this.shouldBeTriggered(), 10))
  },
  methods: {
    shouldBeTriggered: function () {
      const ttc = this.ttc || 1000
      if (this.isMouseOver && this.onMouseDownStarted !== 0) {
        this.percentage = (ttc / 10) * ((Date.now() - this.onMouseDownStarted) / 1000)
        if (this.percentage > 100) this.percentage = 100

        if (Date.now() - this.onMouseDownStarted > ttc) {
          this.trigger = true
        }
      }
    },
    onMouseDown: function () {
      this.onMouseDownStarted = Date.now()
    },
    onMouseUp: function () {
      this.onMouseDownStarted = 0
      this.trigger = false
      this.percentage = 0
    }
  },
  template: `
    <button ref="button" class="btn" @mouseup="onMouseUp" @mousedown="onMouseDown" @mouseenter="isMouseOver = true" @mouseleave="isMouseOver = false">
      <span :style="{opacity: 1 - this.percentage / 100 }">
        <i class="fas mr-1 fa-fw" :class="[icon]" aria-hidden="true"></i>
        <template v-if="onMouseDownStarted === 0">
          {{ title }}
        </template>
        <template v-else>
          {{ holdtitle }}
        </template>
      </span>
    </button>
  `
}

/* button with socket */
window.buttonSocket = {
  props: ['object', 'token'],
  data: function () {
    return {
      socket: io(this.object.on, { query: 'token=' + this.token }),
      state: 0
    }
  },
  methods: {
    send: function () {
      this.state = 1
      console.log(`EMIT => ${this.object.on} [${this.object.emit}]`)
      io(this.object.on, { query: 'token=' + this.token }).emit(this.object.emit, (err, data) => {
        if (err) {
          this.state = 2
          this.$emit('error', err)
          setTimeout(() => {
            this.state = 0
          }, 2000)
        } else {
          // to do eval data
          if (data.do === 'redirect') {
            window.location = data.opts[0]
          } else if (data.do === 'refresh') {
            window.location.reload()
          }
          this.state = 0
        }
      })
    }
  },
  template: `
    <button ref="button" @click="send" :disabled="state !== 0" :class="this.state === 2 ? 'btn-danger' : ''">
      <i v-if="state === 1" class="fas fa-circle-notch fa-spin"></i>
      <i v-if="state === 2" class="fas fa-exclamation"></i>
      {{ commons.translate(object.text) }}
    </button>
  `
}

/* configurableList */
window.configurableList = {
  props: ['current', 'value', 'title'],
  data: function () {
    return {
      show: false,
      currentValue: this.value,
      translatedTitle: commons.translate(this.title)
    }
  },
  watch: {
    currentValue: function () {
      this.onChange()
    }
  },
  methods: {
    onChange: function () {
      this.$emit('update', { value: this.currentValue })
    },
    removeItem: function (index) {
      this.currentValue.splice(index, 1)
    }
  },
  template: `
    <div class="d-flex">
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
          <template v-else>
            {{ translatedTitle.title }}
            <small class="textInputTooltip text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
          </template>
        </span>
      </div>
      <ul class="list-group list-group-flush w-100 border border-input">
        <li class="list-group-item border-0 d-flex" v-for='(v, index) of currentValue'>
          <div class="w-100" :key="index">
            <input type="text" class="form-control" v-model="currentValue[index]"/>
          </div>
          <button class="btn btn-outline-dark border-0" @click="removeItem(index)"><i class="fas fa-times"></i></button>
        </li>
        <li class="list-group-item">
          <button class="btn btn-success" type="button" @click="currentValue.push('')">
            <i class="fas fa-plus"></i> Add new item
          </button>
        </li>
      </ul>
    </div>
  `
}

window.highlightsUrlGenerator = {
  props: ['values', 'title'],
  data() {
    return {
      currentValues: this.values,
      translatedTitle: commons.translate(this.title)
    }
  },
  methods: {
    uuid() {
      var dec2hex = [];
      for (var i=0; i<=15; i++) {
        dec2hex[i] = i.toString(16);
      }

      var uuid = '';
      for (var i=1; i<=36; i++) {
        if (i===9 || i===14 || i===19 || i===24) {
          uuid += '-';
        } else if (i===15) {
          uuid += 4;
        } else if (i===20) {
          uuid += dec2hex[(Math.random()*4|0 + 8)];
        } else {
          uuid += dec2hex[(Math.random()*16|0)];
        }
      }
      return uuid;
    },
    onChange: function () {
      this.$emit('update', this.currentValues)
    },
    removeItem: function (index) {
      this.currentValues.splice(index, 1)
    }
  },
  template: `
  <div class="d-flex">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small class="textInputTooltip text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <ul class="list-group list-group-flush w-100 border border-input">
      <li class="list-group-item border-0 d-flex" v-for='(v, index) of currentValues'>
        <div class="w-100" :key="index">
          <input type="text" class="form-control" v-model="v.url" readonly="true"/>
        </div>
        <button class="btn" :class="{ 'btn-success': v.clip, 'btn-danger': !v.clip }" @click="v.clip = !v.clip; onChange();">CLIP</button>
        <button class="btn" :class="{ 'btn-success': v.highlight, 'btn-danger': !v.highlight }" @click="v.highlight = !v.highlight; onChange();">HIGHLIGHT</button>

        <button class="btn btn-outline-dark border-0" @click="removeItem(index); onChange()"><i class="fas fa-times"></i></button>
      </li>
      <li class="list-group-item">
        <button class="btn btn-success" type="button" @click="currentValues.push({
          url: window.location.origin + '/highlights/' + uuid(),
          clip: false,
          highlight: false,
        }); onChange();">
          <i class="fas fa-plus"></i> Generate new url
        </button>
      </li>
    </ul>
  </div>
  `
}

/* sortableList */
window.sortableList = {
  props: ['values', 'toggle', 'toggleonicon', 'toggleofficon', 'title'],
  data: function () {
    return {
      currentValues: this.values,
      currentToggle: this.toggle,
      translatedTitle: commons.translate(this.title),
      draggingItem: null,
    }
  },
  watch: {
    currentValue: function () {
      this.onChange()
    }
  },
  methods: {
    onChange: function () {
      this.$emit('update', { value: this.currentValues, toggle: this.currentToggle })
    },
    toggleItem: function (idx) {
      this.currentToggle = _.xor(this.currentToggle, [this.currentValues[idx]]);
      this.$forceUpdate()
      this.onChange()
    },
    isToggled: function (idx) {
      const value = this.currentValues[idx]
      return this.currentToggle.indexOf(value) !== -1
    },
    dragstart: function(item, e) {
      this.draggingItem = item;
      this.$refs['list_' + item][0].style.opacity = 0.5;
      e.dataTransfer.setData('text/plain', 'dummy');
    },
    dragenter: function(newIndex, e) {
      const value = this.currentValues[this.draggingItem]
      this.currentValues.splice(this.draggingItem, 1);
      this.currentValues.splice(newIndex, 0, value);
      this.draggingItem = newIndex;

      for (let i = 0, length = this.currentValues.length; i < length; i++) {
        this.$refs['list_' + i][0].style.opacity = 1;
      }
      this.$refs['list_' + newIndex][0].style.opacity = 0.5;

      this.$forceUpdate()
      this.onChange()
    },
    dragend: function(item, e) {
      for (let i = 0, length = this.currentValues.length; i < length; i++) {
        this.$refs['list_' + i][0].style.opacity = 1;
      }
    },
  },
  template: `
    <div class="d-flex">
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
          <template v-else>
            {{ translatedTitle.title }}
            <small class="textInputTooltip text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
          </template>
        </span>
      </div>
      <ul class="list-group list-group-flush w-100 border border-input">
        <li class="list-group-item border-0 d-flex" v-for='(v, index) of currentValues' :ref='"list_" + index'>
          <div class="text-muted btn"
            style="cursor: grab;"
            v-on:dragstart="dragstart(index, $event)"
            v-on:dragend="dragend(index, $event)"
            v-on:dragenter="dragenter(index, $event)"
            draggable="true">
            <i class="fas fa-ellipsis-v"></i>
          </div>
          <div class="w-100" :key="index">
            <input type="text" class="form-control" v-model="currentValues[index]" readonly="true"/>
          </div>
          <button class="btn btn-outline-dark border-0" @click="toggleItem(index)">
            <i class="fas" :class="{ [toggleonicon]: !isToggled(index), [toggleofficon]: isToggled(index) }"></i>
          </button>
        </li>
      </ul>
    </div>
  `
}



/* globalIgnorelistExclude */
window.globalIgnorelistExclude = {
  props: ['value', 'values', 'title'],
  data: function () {
    return {
      currentValues: this.values,
      currentValue: this.value,
      translatedTitle: commons.translate(this.title),
      search: '',
    };
  },
  watch: {
    currentValue: function () {
      this.onChange();
    }
  },
  computed: {
    computedValues() {
      if (this.search.trim().length) {
        const keys = Object.keys(this.values).filter(key => {
          return (String(key).includes(this.search) ||
                 this.values[key].known_aliases.filter(k => k.toLowerCase().includes(this.search.toLowerCase())).length > 0) &&
                 !Object.keys(this.excludedValues).includes(key);
        });
        let toReturn = {};
        for (const key of keys) {
          toReturn[key] = this.values[key];
        }
        return toReturn;
      } else {
        return [];
      }
    },
    excludedValues() {
      const excludedIds = Object.keys(this.values).filter(o => this.currentValue.includes(o));
      let toReturn = {};
      for (const key of excludedIds) {
        toReturn[key] = this.values[key];
      }
      return toReturn;
    }
  },
  methods: {
    addToExcludeList(key) {
      this.currentValue = [...new Set([key, ...this.currentValue])];
    },
    removeFromExcludeList(key) {
      this.currentValue = this.currentValue.filter(o => o !== key);
    },
    onChange: function () {
      this.$emit('update', { value: this.currentValue });
    },
  },
  template: `
    <div>
      <div class="d-flex">
        <div class="input-group-prepend">
          <span class="input-group-text">
            <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
            <template v-else>
              {{ translatedTitle.title }}
              <small class="textInputTooltip text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
            </template>
          </span>
        </div>

        <input class="form-control w-100" type="text" placeholder="Type id or username to search through global ignore list" v-model="search"></input>
      </div>
      <ul style="font-size: 0.75rem;" class="list-group list-group-horizontal text-left" v-for="chunkValues of _.chunk(Object.keys(excludedValues), 2)">
        <button type="button" @click="removeFromExcludeList(key)" class="list-group-item w-50 list-group-item-primary" v-for="key of chunkValues" v-key="key">
        <strong>ID:</strong> {{ key }}<strong><br>Known aliases:</strong> {{ values[key].known_aliases.join(', ') }}<br><strong>Reason:</strong> {{ values[key].reason }}
        </button>
      </ul>
      <ul style="font-size: 0.75rem;" class="list-group list-group-horizontal text-left" v-for="chunkValues of _.chunk(Object.keys(computedValues), 2)">
        <button type="button" @click="addToExcludeList(key)" class="list-group-item w-50" v-for="key of chunkValues" v-key="key">
          <strong>ID:</strong> {{ key }}<strong><br>Known aliases:</strong> {{ values[key].known_aliases.join(', ') }}<br><strong>Reason:</strong> {{ values[key].reason }}
        </button>
      </ul>
      <ul class="list-group list-group-horizontal" style="font-size:0.75rem;">
        <li class="list-group-item w-100 text-center list-group-item-info">Use search input, there are <strong style="font-size: 1.25rem">{{Object.keys(values).length}}</strong> globally ignored users.</li>
      </ul>
    </div>
  `
};
