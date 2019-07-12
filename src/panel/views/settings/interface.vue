<template>
  <div class="container-fluid" ref="window">
    <loading v-if="!$route.params.id" />
    <div class="row" v-else>
      <div class="col-lg-9 col-md-8 col-sm-6">
        <span class="title text-default mb-2">
          {{ translate('menu.settings') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.' + $route.params.type) }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.' + $route.params.id) }}
        </span>

        <loading v-if="state.loaded !== 2 /* State.DONE */" />
        <template v-else v-for="(value, category) of settingsWithoutPermissions">
          <h6 :key="category" >{{ category }}</h6>
          <div class="card mb-2" :key="category">
            <div class="card-body">
              <template v-for="(currentValue, defaultValue) of value">
                <div v-if="typeof value === 'object' && !defaultValue.startsWith('_')" class="p-0 pl-2 pr-2 " :key="currentValue">
                  <template v-if="typeof ui[category] !== 'undefined' && typeof ui[category][defaultValue] !== 'undefined'">
                    <sortable-list
                      v-if="ui[category][defaultValue].type === 'sortable-list'"
                      :values="value[ui[category][defaultValue].values]"
                      :toggle="value[ui[category][defaultValue].toggle]"
                      :toggleonicon="ui[category][defaultValue].toggleOnIcon"
                      :toggleofficon="ui[category][defaultValue].toggleOffIcon"
                      :title="'systems.' + $route.params.id + '.settings.' + defaultValue"
                      @update="value[ui[category][defaultValue].toggle] = $event.toggle; value[defaultValue] = $event.value; triggerDataChange()"
                      class="pt-1 pb-1"></sortable-list>
                    <!--highlights-url-generator
                      v-else-if="ui[category][defaultValue].type === 'highlights-url-generator'"
                      :values="currentValue"
                      :title="'systems.' + $route.params.id + '.settings.' + defaultValue"
                      v-on:update="value[defaultValue] = $event; triggerDataChange()"
                    />
                    <component
                      v-else
                      :is="ui[category][defaultValue].type"
                      :readonly="ui[category][defaultValue].readOnly"
                      :secret="ui[category][defaultValue].secret"
                      :step="ui[category][defaultValue].step"
                      :min="ui[category][defaultValue].min"
                      :max="ui[category][defaultValue].max"
                      :value="currentValue"
                      :values="ui[category][defaultValue].values"
                      @update="value[defaultValue] = $event.value; triggerDataChange()"
                      :title="'systems.' + $route.params.id + '.settings.' + defaultValue"
                      :current="value[ui[category][defaultValue].current]"
                      class="pt-1 pb-1"></component-->
                  </template>
                  <template v-else>
                    <command-input-with-permission
                      v-if="category === 'commands'"
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      v-bind:command="defaultValue"
                      :permissions="settings._permissions[defaultValue]"
                      :token="token"
                      v-on:update="value[defaultValue] = $event.value; settings._permissions[defaultValue] = $event.permissions; triggerDataChange()"
                    ></command-input-with-permission>
                    <toggle
                      class="pt-1 pb-1"
                      v-bind:title="translate('systems.' + $route.params.id + '.settings.' + defaultValue)"
                      v-else-if="typeof currentValue === 'boolean'"
                      v-bind:value="currentValue"
                      v-on:update="value[defaultValue] = !value[defaultValue]; triggerDataChange()"
                    ></toggle>
                    <!--textarea-from-array
                      class="pt-1 pb-1"
                      v-else-if="currentValue.constructor === Array"
                      v-bind:value="currentValue"
                      v-bind:title="translate('systems.' + $route.params.id + '.settings.' + defaultValue)"
                      v-on:update="value[defaultValue] = $event; triggerDataChange()"
                    ></textarea-from-array>
                    <number-input
                      v-else-if="typeof currentValue === 'number'"
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      min="0"
                      v-bind:title="'systems.' + $route.params.id + '.settings.' + defaultValue"
                      :permission="settings._permissions[defaultValue]"
                      v-on:update="value[defaultValue] = $event.value; triggerDataChange()">
                    </number-input>
                    <text-input
                      v-else
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      v-bind:title="'systems.' + $route.params.id + '.settings.' + defaultValue"
                      :permission="settings._permissions[defaultValue]"
                      v-on:update="value[defaultValue] = $event.value; triggerDataChange()"
                    ></text-input-->
                  </template>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>

      <div class="col-lg-3 col-md-4 col-sm-6">
        <div class="sticky-top" style="top: 185px; z-index:0">
          <div class="widget pt-1 mt-3 border-0 bg-light" style="height: auto">
          <div class="pl-2 pr-2 pb-4">
            <transition name="fade">
              <div v-show="isDataChanged" class="alert alert-warning" style="cursor: initial">
                <i class="fas fa-exclamation-circle mr-1"></i>
                {{translate('dialog.changesPending')}}
              </div>
            </transition>
            <transition name="fade">
              <div class="alert alert-danger" v-show="error && showError" style="cursor: initial">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                {{ error }}
              </div>
            </transition>
            <button class="btn btn-block btn-primary" v-on:click="saveSettings" v-if="state.settings === 0">{{ translate('dialog.buttons.saveChanges.idle') }}</button>
            <button disabled="disabled" class="btn btn-block btn-primary" v-on:click="saveSettings" v-if="state.settings === 1">
              <i class="fas fa-circle-notch fa-spin"></i> {{ translate('dialog.buttons.saveChanges.progress') }}</button>
            <button disabled="disabled" class="btn btn-block btn-success" v-on:click="saveSettings" v-if="state.settings === 2">
              <i class="fas fa-check"></i> {{ translate('dialog.buttons.saveChanges.done') }}</button>
            <button disabled="disabled" class="btn btn-block btn-danger" v-on:click="saveSettings" v-if="state.settings === 3">
              <i class="fas fa-check"></i> {{ translate('dialog.buttons.something-went-wrong') }}</button>
          </div>

            <div class="pl-2 pr-2" v-for="system of list" :key="system.name">
              <button
                class="btn btn-block text-left btn-outline-dark"
                :style="getBorderStyle(system.name)"
                v-on:click="setSelected(system.name)"
              >
                {{ translate('menu.' + system.name) }}

                <small
                  v-if="!['core', 'overlays'].includes($route.params.type)"
                  :class="[ system.enabled && !system.isDisabledByEnv && system.areDependenciesEnabled ? 'text-success' : 'text-danger' ]"
                  style="margin: 0px 0px 3px; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;"
                >
                <template v-if="system.isDisabledByEnv">DISABLED BY ENV</template>
                <template v-if="!system.enabled">{{ translate('disabled') }}</template>
                <template v-else-if="!system.areDependenciesEnabled">DEPENDENCIES DISABLED</template>
                <template v-else>{{ translate('enabled') }}</template>
              </small>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import _ from 'lodash';

type systemFromIO = { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean }
enum State {
  NONE, PROGRESS, DONE, ERROR
};

@Component({
  components: {
    'command-input-with-permission': () => import('./components/interface/command-input-with-permission.vue'),
    'loading': () => import('../../components/loading.vue'),
    'sortable-list': () => import('./components/interface/sortable-list.vue'),
    'toggle': () => import('./components/interface/toggle-enable.vue'),
    /*
    'text-input': textInput,
    'number-input': numberInput,
    'textarea-from-array': textAreaFromArray,
    'configurable-list': configurableList,
    'sortable-list': sortableList,
    'highlights-url-generator': highlightsUrlGenerator
  */ }
})
export default class interfaceSettings extends Vue {
  @Prop() readonly commons: any;

  socket: SocketIOClient.Socket = io({ query: "token=" + this.token });
  list: systemFromIO[] = [];
  state: { loaded: State; settings: State } = { loaded: State.NONE, settings: State.NONE };
  settings: any = {};
  ui: any = {};
  isDataChanged: boolean = false;
  error: string | null = null;
  showError: boolean = false;

  get settingsWithoutPermissions() {
    let withoutPermissions = {};
    Object.keys(this.settings).filter(o => o !== '_permissions').forEach((key) => {
      withoutPermissions[key] = this.settings[key]
    })
    return withoutPermissions
  }

  mounted() { this.refresh(this.$route.params.type); }

  @Watch('$route.params.type')
  refresh(v) {
    this.socket.emit(this.$route.params.type, (err, systems: systemFromIO[] ) => {
      if (!systems.map(o => o.name).includes(this.$route.params.id)) {
        this.$router.push({ name: 'InterfaceSettings', params: { type: this.$route.params.type, id: systems[0].name } });
        this.loadSettings(systems[0].name);
      } else if (this.$route.params.id) {
        this.loadSettings(this.$route.params.id);
      }

      this.list = systems;
    })
  }

  getBorderStyle(system) {
    return system === this.$route.params.id ?
      {
        'border-width': '0px',
        'border-left-width': '5px !important'
      } :
      {
        'border-width': '0px',
        'border-left-width': '5px !important',
        'border-color': 'transparent'
      }
  }

  setSelected(system) {
    this.$router.push({ name: 'InterfaceSettings', params: { type: this.$route.params.type, id: system } });
  }

  @Watch('$route.params.id')
  loadSettings(system) {
    if (!this.$route.params.id) {
      return this.refresh(this.$route.params.type)
    };

    this.state.loaded = State.PROGRESS;
    const socket = io(`/${this.$route.params.type}/${system}`, { query: "token=" + this.token });
    socket.emit('settings', (err, _settings, _ui) => {
      if (system !== this.$route.params.id) return // skip if we quickly changed system

      this.state.loaded = State.DONE
      _settings = _(_settings).toPairs().value()
      _ui = _(_ui).toPairs().value()

      let settings: any = { settings: {} }
      let ui: any = { settings: {} }

      // sorting
      // enabled is first
      settings.settings.enabled = _(_settings.filter(o => o[0] === 'enabled')).flatten().value()[1]
      // everything else except commands and enabled and are string|number|bool
      for (let [name, value] of _(_settings.filter(o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1] !== 'object')).value()) {
        settings.settings[name] = value
      }
      // everything else except commands and enabled and are objects -> own category
      for (let [name, value] of _(_settings.filter(o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1] === 'object')).value()) {
        settings[name] = value
      }
      // commands at last
      for (let [name, value] of _(_settings.filter(o => o[0] === 'commands')).value()) {
        settings[name] = value
      }

      // ui
      // everything else except commands and enabled and are string|number|bool
      for (let [name, value] of _(_ui.filter(o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1].type !== 'undefined')).value()) {
        if (typeof settings.settings[name] === 'undefined') settings.settings[name] = null
        ui.settings[name] = value
      }
      // everything else except commands and enabled and are objects -> own category
      for (let [name, value] of _(_ui.filter(o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1].type === 'undefined')).value()) {
        if (typeof settings[name] === 'undefined') settings[name] = {}
        for (let [k, /* v */] of Object.entries(value)) {
          if (typeof settings[name][k] === 'undefined') settings[name][k] = null
        }
        ui[name] = value
      }
      this.isDataChanged = false;

      this.settings = Object.assign({}, settings)
      this.ui = Object.assign({}, ui)
    })
  }

  saveSettings() {
    console.log('saving')
  }

  triggerError (error) {
    this.error = error;
    this.showError = true;
    setTimeout(() => this.showError = false, 2000);
  }
  triggerDataChange() {
    this.isDataChanged = false; this.isDataChanged = true;
  }
}
</script>