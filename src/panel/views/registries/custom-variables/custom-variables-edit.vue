<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.custom-variables') }}
          <template v-if="state.loaded && $route.params.id">
            <small><i class="fas fa-angle-right"></i></small>
            {{variableName}}
            <small>{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/registry/customvariables/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </template>
      <template v-slot:right>
        <state-button @click="save()" text="saveChanges" :state="state.save"/>
      </template>
    </panel>

    <loading v-if="!state.loaded /* State.DONE */" />
    <b-form v-else>
      <b-form-group
        :label="translate('registry.customvariables.variable.name')"
        label-for="variableName"
        :description="translate('registry.customvariables.variable.help')"
      >
        <b-form-input
          id="variableName"
          v-model="variableName"
          type="text"
          :placeholder="translate('registry.customvariables.variable.placeholder')"
        ></b-form-input>
      </b-form-group>

      <b-form-group
        :label="translate('registry.customvariables.description.name')"
        label-for="description"
        :description="translate('registry.customvariables.description.help')"
      >
        <b-form-input
          id="description"
          v-model="description"
          type="text"
          :placeholder="translate('registry.customvariables.description.placeholder')"
        ></b-form-input>
      </b-form-group>

      <b-row>
        <b-col>
          <b-form-group
            :label="translate('registry.customvariables.response.name')"
            label-for="response"
          >
            <button :class="[responseType === 0 ? 'btn-primary' : 'btn-outline-primary']" type="button" class="btn" @click="responseType = 0; responseText = ''">{{ translate('registry.customvariables.response.default') }}</button>
            <button :class="[responseType === 1 ? 'btn-primary' : 'btn-outline-primary']" type="button" class="btn" @click="responseType = 1; responseText = ''">{{ translate('registry.customvariables.response.custom') }}</button>
            <button ref="tooltip1" :class="[responseType === 2 ? 'btn-primary' : 'btn-outline-primary']" type="button" class="btn" @click="responseType = 2; responseText = ''">{{ translate('registry.customvariables.response.command') }}
              <fa icon="question"/>
            </button>

            <b-tooltip :target="() => $refs['tooltip1']" placement="bottom" triggers="hover">
              {{translate('registry.customvariables.useIfInCommand')}}
            </b-tooltip>
          </b-form-group>
          <b-form-group
            v-if="responseType === 1"
            :description="translate('registry.customvariables.response.default-help')"
          >
            <b-form-input
              v-model="responseText"
              type="text"
              :placeholder="translate('registry.customvariables.response.default-placeholder')"
            ></b-form-input>
          </b-form-group>
        </b-col>
        <b-col>
          <b-form-group
            :label="translate('registry.customvariables.permissionToChange')"
            label-for="permission"
          >
            <b-form-select plain v-model="permission" id="permission">
              <option v-for="p of permissions" v-bind:value="p.id" :key="p.id">
                {{ getPermissionName(p.id) | capitalize }}
              </option>
            </b-form-select>
          </b-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col>
          <b-form-group
            :label="translate('registry.customvariables.type.name')"
            label-for="type"
          >
            <b-form-select plain v-model="selectedType" id="selectedType">
              <option v-for="type in types" v-bind:value="type.value" :key="type.value">
                {{ type.text }}
              </option>
            </b-form-select>
          </b-form-group>
        </b-col>
        <b-col>
          <b-form-group
            :label="translate('registry.customvariables.currentValue.name')"
            label-for="type"
          >
            <b-input-group>
              <b-form-input
                v-if="selectedType !== 'options'"
                v-model="currentValue"
                :type="selectedType"
                :readonly="(['', 'eval'].includes(selectedType))"
                :placeholder="translate('registry.customvariables.response.default-placeholder')"
              ></b-form-input>
              <b-form-select plain v-model="currentValue" id="selectedType" v-else>
                <option v-for="option in usableOptionsArray" :value="option" :key="option">{{ option }}</option>
              </b-form-select>
              <b-input-group-append v-if="selectedType !== 'eval'">
                <b-button :variant="readOnly ? 'danger' : 'success'" @click="readOnly = !readOnly">
                  <template v-if="readOnly">
                    {{ translate('registry.customvariables.isReadOnly') }}
                  </template>
                  <template v-else>
                    {{ translate('registry.customvariables.isNotReadOnly') }}
                  </template>
                </b-button>
              </b-input-group-append>
            </b-input-group>
            <small class="form-text text-muted" v-html="translate('registry.customvariables.currentValue.help')"></small>
          </b-form-group>
        </b-col>
      </b-row>

      <b-form-group
        v-if="selectedType.toLowerCase() === 'options'"
        :label="translate('registry.customvariables.usableOptions.name')"
        label-for="usableOptions"
        :description="translate('registry.customvariables.usableOptions.help')"
      >
        <b-form-input
          id="usableOptions"
          v-model="usableOptions"
          :placeholder="translate('registry.customvariables.usableOptions.placeholder')"
        ></b-form-input>
      </b-form-group>


      <b-form-group
        v-if="selectedType.toLowerCase() !== 'eval'"
        :label="translate('registry.customvariables.history')"
        label-for="history"
      >
        <b-table class="hide-headers" :fields="['time', 'sender', 'newValue']" :items="history" borderless small>
          <template slot="time" slot-scope="data">
            {{data.item.timestamp | moment('LL')}} {{ data.item.timestamp | moment('LTS') }}
          </template>
          <template slot="sender" slot-scope="data">
            {{ data.value ? data.value : 'Dashboard'}}
          </template>
          <template slot="newValue" slot-scope="data">
            {{ data.item.currentValue }}
          </template>
        </b-table>
      </b-form-group>

    </b-form>

  </b-container>
</template>

<script lang="ts">
import { Vue, Component/* , Prop */ } from 'vue-property-decorator';
import { chunk, orderBy } from 'lodash';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  }
})
export default class customVariablesEdit extends Vue {
  socket = io('/registry/customVariables', { query: "token=" + this.token });
  psocket = io('/core/permissions', { query: "token=" + this.token });

  state: { loaded: boolean; save: number; } = { loaded: false, save: 0 }

  types = [{
      value: 'number',
      text: this.translate('registry.customvariables.types.number')
    },
    {
      value: 'text',
      text: this.translate('registry.customvariables.types.text')
    },
    {
      value: 'options',
      text: this.translate('registry.customvariables.types.options')
    },
    {
      value: 'eval',
      text: this.translate('registry.customvariables.types.eval')
    }];
  runEveryOptions = [
    { value: 0, type: 'isUsed' },
    { value: 1000, type: 'seconds' },
    { value: 1000 * 60, type: 'minutes' },
    { value: 1000 * 60 * 60, type: 'hours' },
    { value: 1000 * 60 * 60 * 24, type: 'days' },
  ]

  selectedType: string = '';
  selectedRunEvery: string | null = null;
  runEveryX: number = 1;

  variableNameInitial: string = '';
  variableName: string = '';
  description: string = '';
  currentValue: string = '';
  usableOptions: string = '';
  readOnly: boolean = false;
  permission: string | null = null;

  evalValueInit: string = '';
  evalInput: string | null = null;
  evalError: string = '';

  responseType: number = 0;
  responseText: string = '';

  history: any[] = [];
  permissions: any[] = [];

  async mounted() {
    this.state.loaded = false;
    if (this.$route.params.id) {
      await Promise.all([
        new Promise(resolve => {
          this.psocket.emit('find', {}, (err, data) => {
            if (err) return console.error(err)
            this.permissions = orderBy(data, 'order', 'asc')

            if (!this.$route.params.id) {
              if (!this.permission) {
                this.permission = orderBy(this.permissions, 'order', 'asc').pop().id
              }
            }
            resolve()
          })
        }),
        new Promise(resolve => {
          this.socket.emit('load', this.$route.params.id, (data) => {
            this.variableNameInitial = data.variable.variableName
            this.variableName = data.variable.variableName
            this.description = data.variable.description
            this.currentValue = data.variable.currentValue
            this.usableOptions = data.variable.usableOptions
            this.evalValueInit = data.variable.evalValue
            this.selectedRunEvery = data.variable.runEveryType
            this.runEveryX = data.variable.runEvery / data.variable.runEveryTypeValue
            this.selectedType = data.variable.type
            this.responseType = data.variable.responseType
            this.responseText = data.variable.responseText
            this.permission = data.variable.permission || 0
            this.readOnly = data.variable.readOnly || false
            for (let h of data.history) {
              // change timestamp to milliseconds
              h.timestamp = new Date(h.timestamp).getTime()
            }
            this.history = chunk(orderBy(data.history, 'timestamp', 'desc'), 15)[0] || []
            resolve()
          })
        })
      ])
    }
    this.state.loaded = true;
  }

  /*get evalValue() {
    return !_.isNil(this.evalInput) ? this.evalInput.getValue() : ''
  }*/

  get usableOptionsArray() {
    if (typeof this.usableOptions === 'string') {
      return this.usableOptions.split(',').map((o) => o.trim()).filter((o) => o.length > 0)
    } else {
      return []
    }
  }

  getPermissionName(id) {
    if (!id) return 'Disabled'
    const permission = this.permissions.find((o) => {
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
}
</script>

<style>
  table.hide-headers thead { display: none !important; }
</style>

<!--


        <div class="form-group row pl-3 pr-3" v-if="selectedType === 'eval'">
          <div class="col-md-8">
            <label for="variable_name_input">{{ commons.translate('registry.customvariables.scriptToEvaluate') }}</label>
            <div id="custom_variables-textarea" class="border"></div>
          </div>
          <div class="col-md-4">
            <label for="runEvery">{{ commons.translate('registry.customvariables.runScript.name') }}</label>
            <div class="d-flex">
              <select id="runEvery" class="form-control" v-model="selectedRunEvery">
                <option v-for="option in runEveryOptions" v-bind:value="option.type">
                  {{ commons.translate('registry.customvariables.runEvery.' + option.type) }}
                </option>
              </select>
              <input type="text" v-model="runEveryX" class="form-control ml-2" v-if="selectedRunEvery !== 'isUsed'" />
            </div>

            <button type="button" class="btn btn-block btn-info mt-4" v-on:click="testScript()">{{ commons.translate('registry.customvariables.testCurrentScript.name') }}</button>
            <small class="form-text text-muted" v-html="commons.translate('registry.customvariables.testCurrentScript.help')"></small>
            <pre v-if="evalError.length > 0" class="alert alert-danger mt-2">{{ evalError }}</pre>

          </div>
        </div>
      </form>
    <!-- ->
  </div>
</span>

<script>
      methods: {
        testScript: function () {
          this.socket.emit('test.script', { evalValue: this.evalValue, currentValue: this.currentValue }, (err, response) => {
            if (err) {
              this.evalError = err
              this.evalOk = false
            } else {
              this.evalError = ''
              this.evalOk = true
            }
            this.currentValue = response
          })
        },
        validateForm: function () {
          // reset errors
          for (let [key, value] of Object.entries(this.hasError)) {
            if (key !== 'isNotUnique') {
              this.$set(this.hasError, key, false)
            }
          }
          if (this.variableName.length === 0 || (this.variableName.length === 2 && this.variableName.startsWith('$_'))) this.hasError.variableName = true

          if (this.selectedType === '') {
            this.$set(this.hasError, 'selectedType', true)
          } else if (this.selectedType === 'number') {
            if (_.isNaN(Number(this.currentValue))) this.currentValue = 0
            else this.currentValue = Number(this.currentValue) // retype
          } else if (this.selectedType === 'options') {
            // check options
            if (this.usableOptionsArray.length === 0) {
              this.$set(this.hasError, 'usableOptions', true)
            }
            // if current value is not set or is not set as option -> force first item
            if (String(this.currentValue).trim().length === 0 || !this.usableOptionsArray.includes(String(this.currentValue).trim())) this.currentValue = this.usableOptionsArray[0]
          } else if (this.selectedType === 'eval') {
            if (this.runEveryX < 1) {
              this.runEveryX = 0
            }
          }

          return _.filter(this.hasError, (o) => o === true).length === 0
        },
        saveChanges: function () {
          if (this.validateForm()) {
            this.saveState = 1
            const data = {
              _id: this.id,
              variableName: this.variableName,
              description: this.description,
              currentValue: this.currentValue,
              usableOptions: this.usableOptions || '',
              evalValue: this.evalValue,
              runEvery: this.selectedType === 'eval' ? this.runEveryOptions.find((o) => o.type === this.selectedRunEvery).value * this.runEveryX : 0,
              runEveryType:  this.selectedType === 'eval' ? this.selectedRunEvery : 'isUsed',
              runEveryTypeValue:  this.selectedType === 'eval' ? this.runEveryOptions.find((o) => o.type === this.selectedRunEvery).value : 0,
              type: this.selectedType,
              readOnly: this.readOnly,
              responseType: this.responseType,
              responseText: this.responseText,
              permission: this.permission
            }
            this.socket.emit('save', data, (err, _id) => {
              if (err) {
                console.error(err)
                return this.saveState = 3
              }
              this.saveState = 2

              this.variableNameInitial = this.variableName
              // if we are creating new -> refresh
              if (_.isNil(data._id)) setTimeout(() => page(`?id=${_id}#registry/customVariables/edit`), 3000)
            })
          }
        },
        initializeEvalTextArea: function () {
          const textarea = document.getElementById('custom_variables-textarea')
          if (_.isNil(textarea)) return setTimeout(() => this.initializeEvalTextArea(), 1)

          this.evalInput = CodeMirror(textarea, {
            value: this.evalValueInit ||
`/* Available functions
    user(username?: string): Promise<{ username: string, id: string, is: { follower: boolean, mod: boolean, online: boolean, subscriber: boolean, vip: boolean }}> - returns user object (if null -> sender)
    url(url: string, opts?: { method: 'POST' | 'GET', headers: object, data: object}): Promise<{ data: object, status: number, statusText: string}>
 *
 * Available variables
    _, _current, users, param (only in custom command)
    sender?: { // (only in custom commands, keyword)
      username: string,
      userId: string,
    }
    random: {
      online: {
        viewer: string,
        follower: string,
        subscriber: string
      },
      viewer: string,
      follower: string,
      subscriber: string
    }
    stream: {
      uptime: string,
      chatMessages: number,
      currentViewers: number,
      currentBits: number,
      currentFollowers: number,
      currentHosts: number,
      currentViews: number,
      currentTips: number,
      currentWatched: number,
      currency: string,
      maxViewers: number,
      newChatters: number,
      game: string,
      status: string
    }
 *
 * IMPORTANT: Must contain return statement!
 */

return '';`,
            mode:  "javascript",
            lineNumbers: true,
            matchBrackets: true,
            lint: {
              esversion: 6
            },
            gutters: ["CodeMirror-lint-markers"]
          })
          this.evalInput.setSize(null, 1000);
        },
        isUnique: function () {
          if (this.variableName !== this.variableNameInitial) {
            this.socket.emit('isUnique', this.variableName, (err, isUnique) => {
              this.hasError.isNotUnique = !isUnique
            })
          }
        }
      },
      created: function () {
        // _.debounce is a function provided by lodash to limit how
        // often a particularly expensive operation can be run.
        // In this case, we want to limit how often we access
        // yesno.wtf/api, waiting until the user has completely
        // finished typing before making the ajax request. To learn
        // more about the _.debounce function (and its cousin
        // _.throttle), visit: https://lodash.com/docs#debounce
        this.debouncedIsUnique =_.debounce(this.isUnique, 500)
        this.psocket.emit('find', {}, (err, data) => {
          if (err) return console.error(err)
          this.permissions = _.orderBy(data, 'order', 'asc')

          if (!commons.urlParam('id')) {
            if (!this.permission) {
              this.permission = _.orderBy(this.permissions, 'order', 'asc').pop().id
            }
          }
        })
      },
      watch: {
        deleteState: function (cur, old) {
          if (cur === 'deleted') {
            this.socket.emit('delete', commons.urlParam('id'), () => {
              page('/#registry/customVariables/list')
            })
          }
        },
        saveState: function (cur, old) {
          if (cur === 2 || cur === 3) setTimeout(() => this.saveState = 0, 3000)
        },
        variableName: function (cur, old) {
          if (!cur.startsWith('$_')) this.variableName = '$_' + cur
          this.variableName = this.variableName.replace(/ /g, '_')
          this.debouncedIsUnique()
        },
        selectedType: function (cur, old) {
          if (cur === 'eval') {
            this.initializeEvalTextArea()
            this.selectedRunEvery = this.selectedRunEvery || 'isUsed'
          } else if (cur === 'options') {
            // check if value or change it
            if (!this.usableOptionsArray.includes(this.currentValue)) this.currentValue = this.usableOptionsArray[0]
          } else {
            this.evalInput = null
          }
        },
        usableOptionsArray: function (cur, old) {
          if (!cur.includes(this.currentValue)) this.currentValue = cur[0] // set initial value only if value doesn't exist
        }
      },
      computed: {
        evalValue: function () {
          return !_.isNil(this.evalInput) ? this.evalInput.getValue() : ''
        },
        usableOptionsArray: function () {
          if (typeof this.usableOptions === 'string') {
            return this.usableOptions.split(',').map((o) => o.trim()).filter((o) => o.length > 0)
          } else {
            return []
          }
        },
        isEditation: function () {
          return !_.isNil(commons.urlParam('id'))
        },
        title: function () {
          return commons.translate(this.isEditation ? 'dialog.title.edit' : 'dialog.title.add')
        }
      }
    })
</script>
-->