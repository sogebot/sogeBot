/* globals translations, commons, Vue, _, io  */

const flattenKeys = (obj, path = []) =>
  !_.isObject(obj)
    ? { [path.join('.')]: obj }
    : _.reduce(obj, (cum, next, key) => _.merge(cum, flattenKeys(next, [...path, key])), {});

/* div with html filters */
window.textWithTags = {
  props: ['value'],
  filters: {
    filterize: function (val) {
      const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(flattenKeys(translations.responses.variable)), (o) => -o.length).join('|') + ')', 'g');
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let matches = val.match(filtersRegExp);
      let output = val;
      if (!_.isNil(matches)) {
        for (let match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${commons.translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`);
        }
      }
      return output;
    }
  },
  template: `
    <div style="flex: 1 1 auto;" v-html="$options.filters.filterize(value)"></div>
    `
};

/* command input for settings  */
window.commandInput = {
  props: ['value', 'command', 'type'],
  methods: {
    update: function () {
      if (this.type === 'number') {
        if (_.isFinite(Number(this.currentValue))) {this.currentValue = Number(this.currentValue);}
        else {this.currentValue = this.value;};
      }
      this.$emit('update', this.currentValue);
    }
  },
  data: function () {
    return {
      currentValue: this.value
    };
  },
  template: `
    <div class="input-group">
      <div class="input-group-prepend">
        <span class="input-group-text">{{ command }}</span>
      </div>
      <input v-on:keyup="update" v-model="currentValue" class="form-control" type="text" />
    </div>`
};


/* textarea input for arrays  */
window.textAreaFromArray = {
  props: ['value', 'title'],
  methods: {
    update: function () {
      this.$emit('update', this.currentValue.split('\n'));
    }
  },
  data: function () {
    return {
      currentValue: this.value.join('\n')
    };
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
};

/* textarea with editation */
window.textAreaWithTags = {
  props: ['value', 'placeholder', 'error', 'filters'],
  watch: {
    editation: function (val, old) {
      if (val) {
        // focus textarea and set height
        if (this.currentValue.trim().length === 0) {
          this.height = this.$refs.placeholder.clientHeight;
        } else {this.height = this.$refs.div.clientHeight;};
        Vue.nextTick(() => {
          this.$refs.textarea.focus();
        });
      } else {
        // texteare unfocused, set height of div
        this.height = this.$refs.textarea.clientHeight;
      }
    }
  },
  computed: {
    _placeholder: function () {
      return !this.placeholder || this.placeholder.trim().length === 0 ? '&nbsp;' : this.placeholder;
    },
    currentValue: {
      get: function () {
        return this.value;
      },
      set: function (newValue) {
        this.$emit('update', newValue);
      }
    },
    heightStyle: function () {
      if (this.height === 0) {return 'height: auto';};
      return `height: ${this.height + 2}px`;
    },
  },
  mounted() {
    this.timeout = setInterval(() => {
      this.updateFilterBtnPosX();
      this.updateFilterBtnPosY();
    }, 100);
  },
  destroyed() {
    clearInterval(this.timeout);
  },
  filters: {
    filterize: function (val) {
      const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(flattenKeys(translations.responses.variable)), (o) => -o.length).join('|') + ')', 'g');
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let matches = val.match(filtersRegExp);
      let output = val;
      if (!_.isNil(matches)) {
        for (let match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${commons.translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`);
        }
      }
      return output;
    }
  },
  methods: {
    updateFilterBtnPosX() {
      Vue.nextTick(() => {
        let client = null;

        if (this.editation) {
          client = this.$refs.textarea.getBoundingClientRect();
        } else {
          if (this.currentValue.trim().length === 0) {
            client = this.$refs.placeholder.getBoundingClientRect();
          } else {
            client = this.$refs.div.getBoundingClientRect();
          }
        }
        this.btnPosX = client.x + client.width - 50;
      });
    },
    updateFilterBtnPosY() {
      Vue.nextTick(() => {
        let client = null;

        if (this.editation) {
          client = this.$refs.textarea.getBoundingClientRect();
        } else {
          if (this.currentValue.trim().length === 0) {
            client = this.$refs.placeholder.getBoundingClientRect();
          } else {
            client = this.$refs.div.getBoundingClientRect();
          }
        }
        this.btnPosY = client.y + client.height - 47;
      });
    },
    onEnter (e) {
      // don't add newline
      e.stopPropagation();
      e.preventDefault();
      e.returnValue = false;
      this.input = e.target.value;
    },
    addVariable(variable) {
      this.currentValue += '$' + variable;
      this.editation = true;
      Vue.nextTick(() => {
        this.$refs.textarea.focus();
      });
    },
    toggleFilters() {
      this.isFiltersVisible = !this.isFiltersVisible;
      this.editation = true;
      Vue.nextTick(() => {
        this.$refs.textarea.focus();
      });
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
    };
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
};

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
    };
  },
  watch: {
    trigger: function (val) {
      if (val) {
        this.$emit('trigger');
      }
    },
    isMouseOver: function (val) {
      if (!val) {
        this.onMouseDownStarted = 0;
        this.trigger = false;
        this.percentage = 0;
      }
    }
  },
  destroyed: function () {
    for (let i of this.intervals) {clearInterval(i);};
  },
  mounted: function () {
    this.intervals.push(setInterval(() => this.shouldBeTriggered(), 10));
  },
  methods: {
    shouldBeTriggered: function () {
      const ttc = this.ttc || 1000;
      if (this.isMouseOver && this.onMouseDownStarted !== 0) {
        this.percentage = (ttc / 10) * ((Date.now() - this.onMouseDownStarted) / 1000);
        if (this.percentage > 100) {this.percentage = 100;};

        if (Date.now() - this.onMouseDownStarted > ttc) {
          this.trigger = true;
        }
      }
    },
    onMouseDown: function () {
      this.onMouseDownStarted = Date.now();
    },
    onMouseUp: function () {
      this.onMouseDownStarted = 0;
      this.trigger = false;
      this.percentage = 0;
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
};

/* button with socket */
window.buttonSocket = {
  props: ['object', 'token'],
  data: function () {
    return {
      socket: io(this.object.on, { query: 'token=' + this.token }),
      state: 0
    };
  },
  methods: {
    send: function () {
      this.state = 1;
      console.log(`EMIT => ${this.object.on} [${this.object.emit}]`);
      io(this.object.on, { query: 'token=' + this.token }).emit(this.object.emit, (err, data) => {
        if (err) {
          this.state = 2;
          this.$emit('error', err);
          setTimeout(() => {
            this.state = 0;
          }, 2000);
        } else {
          // to do eval data
          if (data.do === 'redirect') {
            window.location = data.opts[0];
          } else if (data.do === 'refresh') {
            window.location.reload();
          }
          this.state = 0;
        }
      });
    }
  },
  template: `
    <button ref="button" @click="send" :disabled="state !== 0" :class="this.state === 2 ? 'btn-danger' : ''">
      <i v-if="state === 1" class="fas fa-circle-notch fa-spin"></i>
      <i v-if="state === 2" class="fas fa-exclamation"></i>
      {{ commons.translate(object.text) }}
    </button>
  `
};

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
