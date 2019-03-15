<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#customvariables-main" aria-controls="home" role="tab" data-toggle="tab" title="Custom Variables">
          <fa icon="dollar-sign" />
        </a>
      </li>
      <li role="presentation">
        <a class="nav-link" href="#customvariables-settings" aria-controls="home" role="tab" data-toggle="tab" title="Settings">
          <fa icon="cog" />
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{commons.translate('widget-title-customvariables')}}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="customvariables-main">
        <div v-for="(variable, index) of watchedVariables" :key="index">
          <div class="input-group" v-bind:class="{ 'pt-1': index != 0 }">
            <div class="input-group-prepend">
              <span class="input-group-text">{{ variable.variableName }}</span>
            </div>
            <template v-if="variable.type === 'text'">
              <number-or-text
                v-bind:id="String(variable._id)"
                v-bind:value="variable.currentValue"
                type="text"
                v-on:update="onUpdate">
              </number-or-text>
            </template>
            <template v-else-if="variable.type ==='eval'">
              <input type="text" class="form-control" readonly v-bind:value="variable.currentValue">
              <span class="input-group-text border-left-0"><fa icon="code" /></span>
            </template>
            <template v-else-if="variable.type ==='number'">
              <number-or-text
                v-bind:id="String(variable._id)"
                v-bind:value="variable.currentValue"
                type="number"
                v-on:update="onUpdate">
              </number-or-text>
            </template>
            <template v-else-if="variable.type ==='options'">
              <select class="form-control" v-model="variable.currentValue" v-on:change="onUpdate(String(variable._id), variable.currentValue)">
                <option
                  v-for="option of variable.usableOptions.split(',').map((o) => o.trim())"
                  v-bind:key="option"
                  v-bind:value="String(option)">
                  {{ option }}</option>
              </select>
            </template>
          </div>
        </div>
      </div>
      <!-- /MAIN -->

      <div role="tabpanel" class="tab-pane" id="customvariables-settings">
        <span v-if="nonWatchedVariablesCount > 0">
          <select class="form-control" v-model="selectedVariable">
            <option v-bind:value="String(variable._id)" :key="String(variable._id)" v-for="variable of nonWatchedVariables">{{ variable.variableName }}</option>
          </select>
          <button class="btn btn-block btn-primary" v-on:click="addToWatch(selectedVariable)">{{ commons.translate('widgets.customvariables.add-variable-into-watchlist') }}</button>
        </span>
        <span v-else>
          <div class="alert alert-warning" v-html="commons.translate('widgets.customvariables.no-custom-variable-found')"></div>
        </span>

        <span v-if="watched.length > 0">
          <h6 class="mt-2 mb-0">{{ commons.translate('widgets.customvariables.watchlist') }}</h6>
          <ul class="list-group list-group-flush">
            <li class="list-group-item" v-for="(watch, index) of watchedVariables" :key="index">
              <span class="row">
                <div class="col-md-2 pt-2" style="line-height: 2rem;">
                  <button v-if="index !== 0" class="btn btn-block btn-link col-md-2" v-on:click="moveUp(String(watch._id))"><fa icon="angle-up" /></button>
                </div>
                <div class="col-md p-2" style="overflow:hidden; line-height: 2rem;">
                  {{ watch.variableName }}
                  <button class="btn float-right btn-outline-danger border-0" v-on:click="unWatch(String(watch._id))"><fa icon="trash-alt" /></button>
                </div>
                <div class="col-md-2 pt-2" style="line-height: 2rem;">
                  <button v-if="index !== watchedVariables.length - 1" class="btn btn-block btn-link col-md-2" v-on:click="moveDown(String(watch._id))"><fa icon="angle-down" /></button>
                </div>
              </span>
            </li>
          </ul>
        </span>
      </div>
      <!-- /SETTINGS -->
    </div>
  </div>
</div>
</template>

<script>
var numberOrTextComponent = {
  props: ['id', 'value', 'type'],
  watch: {
    value: function (val) {
      this.currentValue = this.value
    },
    currentValue: function (val, old) {
      this.showSaveButton = this.initialValue != this.currentValue
    }
  },
  methods: {
    update: function (val) {
      if (val) this.currentValue = Number(this.currentValue) + Number(val)
      else if (this.type === 'number') this.currentValue = Number(this.currentValue)
      if (_.isNaN(this.currentValue)) this.currentValue = 0

      this.initialValue = this.currentValue
      this.showSaveButton = false

      this.$emit('update', this.id, this.currentValue)
    },
    onKeyUp: function (event) {
      if (event.key === 'Enter') this.update()
    }
  },
  data: function () {
    return {
      showSaveButton: false,
      currentValue: this.value
    }
  },
  created: function () {
    this.initialValue = this.value
  },
  template: `
    <div class="form-control p-0 d-flex border-0">
      <input type="text" class="form-control" v-model="currentValue" style="z-index:99" v-on:keyup="onKeyUp">
      <div class="input-group-append">
        <button class="btn btn-primary" v-bind:class="{'d-none' : type !== 'number'}" type="button" v-on:click="update(1)"><fa icon="plus" /></button>
        <button class="btn btn-danger" v-bind:class="{'d-none' : type !== 'number'}" type="button" v-on:click="update(-1)"><fa icon="minus" /></button>
        <button class="btn btn-secondary" v-bind:class="{'d-none' : !showSaveButton}" type="button" v-on:click="update()"><fa icon="download" /></button>
        <span class="input-group-text">
          <strong v-if="this.type === 'number'">0-9</strong>
          <fa icon="font" v-else />
        </span>
      </div>
    </div>
    `
}
export default {
  props: ['commons'],
  components: {
    'number-or-text': numberOrTextComponent
  },
  data: function () {
    return {
      variables: [],
      watched: [],
      selectedVariable: null,
      socket: io('/widgets/customvariables', { query: "token=" + token })
      }
  },
  mounted: function () {
    this.$emit('mounted')
  },
  created: function () {
    this.socket.on('refresh', () => {
      this.refreshVariablesList()
      this.refreshWatchList()
    })
    this.refreshVariablesList()
    this.refreshWatchList()
  },
  computed: {
    watchedVariables: function () {
      let watched = []
      for (let variable of this.variables) {
        let filtered = this.watched.filter((o) => o.variableId === String(variable._id))
        if (filtered.length !== 0) {
          variable.order = filtered[0].order
          watched.push(variable)
        }
      }
      return _.orderBy(watched, 'order', 'asc')
    },
    nonWatchedVariables: function () {
      let nonWatched = []
      for (let variable of this.variables) {
        let filtered = this.watched.filter((o) => o.variableId === String(variable._id))
        if (filtered.length === 0) nonWatched.push(variable)
      }
      return nonWatched
    },
    nonWatchedVariablesCount: function () {
      return _.size(this.nonWatchedVariables)
    }
  },
  watch: {
    nonWatchedVariables: function () {
      if (!_.isNil(this.nonWatchedVariables[0])) this.selectedVariable = this.nonWatchedVariables[0]._id
    }
  },
  methods: {
    onUpdate: function (_id, value) {
      this.socket.emit('set.value', { _id, value }, (err) => {
        this.refreshVariablesList()
        this.refreshWatchList()
      })
    },
    moveUp: function (variableId) {
      this.socket.emit('move.up', variableId, (err, variableId) => {
        this.refreshWatchList()
      })
    },
    moveDown: function (variableId) {
      this.socket.emit('move.down', variableId, (err, variableId) => {
        this.refreshWatchList()
      })
    },
    addToWatch: function (variableId) {
      if (!_.isNil(variableId)) {
        this.socket.emit('add.watch', variableId, (err, variableId) => {
          this.refreshWatchList()
        })
      }
    },
    unWatch: function (variableId) {
      if (!_.isNil(variableId)) {
        this.socket.emit('rm.watch', variableId, (err, variableId) => {
          this.refreshWatchList()
        })
      }
    },
    refreshVariablesList: function () {
      this.socket.emit('list.variables', (err, data) => {
        this.variables = data

      })
    },
    refreshWatchList: function () {
      this.socket.emit('list.watch', (err, data) => {
        this.watched = data
      })
    }
  }
}
</script>
