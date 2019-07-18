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
          <h6 :key="category + '#1'" >{{ category }}</h6>
          <div class="card mb-2" :key="category + '#2'">
            <div class="card-body">
              <template v-for="(currentValue, defaultValue) of value">
                <div v-if="typeof value === 'object' && !defaultValue.startsWith('_')" class="p-0 pl-2 pr-2 " :key="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue">
                  <template v-if="typeof ui[category] !== 'undefined' && typeof ui[category][defaultValue] !== 'undefined'">
                    <sortable-list
                      v-if="ui[category][defaultValue].type === 'sortable-list'"
                      :values="value[ui[category][defaultValue].values]"
                      :toggle="value[ui[category][defaultValue].toggle]"
                      :toggleonicon="ui[category][defaultValue].toggleOnIcon"
                      :toggleofficon="ui[category][defaultValue].toggleOffIcon"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      @update="value[ui[category][defaultValue].toggle] = $event.toggle; value[defaultValue] = $event.value; triggerDataChange()"
                      class="pt-1 pb-1"></sortable-list>
                    <highlights-url-generator
                      v-else-if="ui[category][defaultValue].type === 'highlights-url-generator'"
                      :values="currentValue"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      v-on:update="value[defaultValue] = $event; triggerDataChange()"
                    />
                    <a v-else-if="ui[category][defaultValue].type === 'link'" :href="ui[category][defaultValue].href" class="mt-1 mb-1" :class="ui[category][defaultValue].class" :target="ui[category][defaultValue].target">
                      <template v-if="ui[category][defaultValue].rawText">{{ ui[category][defaultValue].rawText }}</template>
                      <template v-else>{{ translate(ui[category][defaultValue].text) }}</template>
                    </a>
                    <component
                      v-else
                      :is="ui[category][defaultValue].type"
                      :readonly="ui[category][defaultValue].readOnly"
                      :secret="ui[category][defaultValue].secret"
                      :step="ui[category][defaultValue].step"
                      :min="ui[category][defaultValue].min"
                      :max="ui[category][defaultValue].max"
                      :class="ui[category][defaultValue].class"
                      :emit="ui[category][defaultValue].emit"
                      :value="currentValue"
                      :values="ui[category][defaultValue].values"
                      @update="value[defaultValue] = $event.value; triggerDataChange()"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      :current="value[ui[category][defaultValue].current]"
                      class="pt-1 pb-1"></component>
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
                    <toggle-enable
                      class="pt-1 pb-1"
                      v-bind:title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                      v-else-if="typeof currentValue === 'boolean'"
                      v-bind:value="currentValue"
                      v-on:update="value[defaultValue] = !value[defaultValue]; triggerDataChange()"
                    ></toggle-enable>
                    <textarea-from-array
                      class="pt-1 pb-1"
                      v-else-if="currentValue.constructor === Array"
                      v-bind:value="currentValue"
                      v-bind:title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                      v-on:update="value[defaultValue] = $event; triggerDataChange()"
                    ></textarea-from-array>
                    <number-input
                      v-else-if="typeof currentValue === 'number'"
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      min="0"
                      v-bind:title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      v-on:update="value[defaultValue] = $event.value; triggerDataChange()">
                    </number-input>
                    <text-input
                      v-else
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      v-bind:title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      v-on:update="value[defaultValue] = $event.value; triggerDataChange()"
                    ></text-input>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>

      <div class="col-lg-3 col-md-4 col-sm-6">
        <div
          ref="menu"
          :class="{
            'sticky-top': configuration.core.ui.stickystats,
            'pr-2': configuration.core.ui.stickystats,
          }"
          class="pt-3"
          :style="{
            top: configuration.core.ui.stickystats ? topOfMenu + 'px' : '',
            height: configuration.core.ui.stickystats ? heightOfMenu : 'auto',
            overflow: configuration.core.ui.stickystats ? 'scroll' : 'inherit',
            'z-index': 0
            }">
          <div class="widget border-0 bg-light" style="height: auto">
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
    'btn-emit': () => import('./components/interface/btn-emit.vue'),
    'checklist': () => import('./components/interface/checklist.vue'),
    'command-input-with-permission': () => import('./components/interface/command-input-with-permission.vue'),
    'configurable-list': () => import('./components/interface/configurable-list.vue'),
    'credits-custom-texts': () => import('./components/interface/credits-custom-texts.vue'),
    'credits-social': () => import('./components/interface/credits-social.vue'),
    'global-ignorelist-exclude': () => import('./components/interface/global-ignorelist-exclude.vue'),
    'heist-levels': () => import('./components/interface/heist-levels.vue'),
    'heist-results': () => import('./components/interface/heist-results.vue'),
    'highlights-url-generator': () => import('./components/interface/highlights-url-generator.vue'),
    'loading': () => import('../../components/loading.vue'),
    'number-input': () => import('./components/interface/number-input.vue'),
    'selector': () => import('./components/interface/selector.vue'),
    'sortable-list': () => import('./components/interface/sortable-list.vue'),
    'text-input': () => import('./components/interface/text-input.vue'),
    'textarea-from-array': () => import('./components/interface/textarea-from-array.vue'),
    'toggle-enable': () => import('./components/interface/toggle-enable.vue'),
    'wof-responses': () => import('./components/interface/wof-responses.vue'),
    }
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

  topOfMenu: number = 168;
  heightOfMenu: string = '0';
  heightOfMenuInterval: number = 0;

  get settingsWithoutPermissions() {
    let withoutPermissions = {};
    Object.keys(this.settings).filter(o => o !== '_permissions').forEach((key) => {
      withoutPermissions[key] = this.settings[key]
    })
    return withoutPermissions
  }

  mounted() {
    this.refresh();

    this.heightOfMenuInterval = window.setInterval(() => {
      this.heightOfMenuUpdate()
    }, 1000)
  }

  destroyed() {
    clearInterval(this.heightOfMenuInterval)
  }

  heightOfMenuUpdate() {
    this.heightOfMenu = String(window.innerHeight - Math.max((<HTMLElement>this.$refs.menu).getBoundingClientRect().top, this.topOfMenu) - 50) + 'px';
  }

  @Watch('$route.params.type')
  refresh() {
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
      return this.refresh()
    };

    this.state.loaded = State.PROGRESS;
    io(`/${this.$route.params.type}/${system}`, { query: "token=" + this.token })
      .emit('settings', (err, _settings, _ui) => {
        if (system !== this.$route.params.id) return // skip if we quickly changed system

        this.state.loaded = State.DONE
        _settings = _(_settings).toPairs().value()
        _ui = _(_ui).toPairs().value()

        let settings: any = { settings: {} }
        let ui: any = { settings: {} }

        // sorting
        // enabled is first - remove on core/overlay
        if (!['core', 'overlays'].includes(this.$route.params.type)) {
          settings.settings.enabled = _(_settings.filter(o => o[0] === 'enabled')).flatten().value()[1]
        }

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

        // remove empty categories
        Object.keys(settings).forEach(key => {
          if (_.size(settings[key]) === 0) {
            delete settings[key]
          }
        })
        Object.keys(ui).forEach(key => {
          if (_.size(ui[key]) === 0) {
            delete ui[key]
          }
        })

        console.debug({ui, settings});
        this.settings = Object.assign({}, settings)
        this.ui = Object.assign({}, ui)
      })
  }

  saveSettings() {
    this.state.settings = 1
    let settings = _.cloneDeep(this.settings)

    if (settings.settings) {
      for (let [name,value] of Object.entries(settings.settings)) {
        delete settings.settings[name]
        settings[name] = value
      }
      delete settings.settings
    }

    io(`/${this.$route.params.type}/${this.$route.params.id}`, { query: "token=" + this.token })
      .emit('settings.update', settings, (err) => {
        setTimeout(() => this.state.settings = 0, 1000)
        if (err) {
          this.state.settings = 3
          console.error(err)
        } else {
          this.state.settings = 2
          this.isDataChanged = false
        }
        setTimeout(() => {
          this.refresh();
        })
      })
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