<template>
  <div class="container-fluid" ref="window">
    <loading v-if="!$route.params.id" />
    <div class="row" v-else>
      <div class="col-lg-9 col-md-8 col-sm-6">
        <span class="title text-default mb-2">
          {{ translate('menu.settings') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.' + $route.params.type) }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.' + $route.params.id) }}
        </span>

        <loading v-if="state.loaded !== 2 /* State.DONE */" />
        <template v-else v-for="(value, category) of settingsWithoutPermissions">
          <h6 :key="category + '#1'" >{{ category.replace('_', ' ') }}</h6>
          <div class="card mb-2" :key="category + '#2'" v-if="value !== null">
            <div class="card-body">
              <template v-for="(currentValue, defaultValue) of value">
                <div v-if="typeof value === 'object' && !defaultValue.startsWith('_')" class="p-0 pl-2 pr-2 " :key="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue">
                  <template v-if="typeof ui[category] !== 'undefined' && typeof ui[category][defaultValue] !== 'undefined'">
                    <template v-if="ui[category][defaultValue].showIf ? showIfCheck(ui[category][defaultValue].showIf) : true">
                      <sortable-list
                        v-if="ui[category][defaultValue].type === 'sortable-list'"
                        :values="value[ui[category][defaultValue].values]"
                        :toggle="value[ui[category][defaultValue].toggle]"
                        :toggleonicon="ui[category][defaultValue].toggleOnIcon"
                        :toggleofficon="ui[category][defaultValue].toggleOffIcon"
                        :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                        @update="value[ui[category][defaultValue].toggle] = $event.toggle; settings[category][defaultValue] = $event.value; triggerDataChange()"
                        class="pt-1 pb-1"></sortable-list>
                      <highlights-url-generator
                        v-else-if="ui[category][defaultValue].type === 'highlights-url-generator'"
                        :values="currentValue"
                        :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                        v-on:update="settings[category][defaultValue] = $event; triggerDataChange()"
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
                      @update="settings[category][defaultValue] = $event.value; triggerDataChange()"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      :current="value[ui[category][defaultValue].current]"
                      class="pt-1 pb-1"></component>
                    </template>
                  </template>
                  <template v-else>
                    <command-input-with-permission
                      v-if="category === 'commands'"
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      v-bind:command="defaultValue"
                      :permissions="settings._permissions[defaultValue]"
                      v-on:update="settings[category][defaultValue] = $event.value; settings._permissions[defaultValue] = $event.permissions; triggerDataChange()"
                    ></command-input-with-permission>
                    <toggle-enable
                      class="pt-1 pb-1"
                      v-bind:title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                      v-else-if="typeof currentValue === 'boolean'"
                      v-bind:value="currentValue"
                      v-on:update="settings[category][defaultValue] = !settings[category][defaultValue]; triggerDataChange()"
                    ></toggle-enable>
                    <textarea-from-array
                      class="pt-1 pb-1"
                      v-else-if="currentValue.constructor === Array"
                      v-bind:value="currentValue"
                      v-bind:title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                      v-on:update="settings[category][defaultValue] = $event; triggerDataChange()"
                    ></textarea-from-array>
                    <number-input
                      v-else-if="typeof currentValue === 'number'"
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      min="0"
                      v-bind:title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      v-on:update="settings[category][defaultValue] = $event.value; triggerDataChange()">
                    </number-input>
                    <text-input
                      v-else
                      class="pt-1 pb-1"
                      v-bind:type="typeof currentValue"
                      v-bind:value="currentValue"
                      v-bind:title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      v-on:update="settings[category][defaultValue] = $event.value; triggerDataChange()"
                    ></text-input>
                  </template>
                </div>
              </template>
            </div>
          </div>
          <template v-if="permissions.length > 0 && Object.keys(settings).includes('__permission_based__') && settings['__permission_based__'][category]">
            <div :key="category + '__permission_based__#1'">
              <b-card no-body>
                <b-tabs pills card vertical>
                  <b-tab v-for="permission of permissions" :title="permission.name" :key="permission.id">
                    <b-card-text>
                      <template v-for="(currentValue, defaultValue) of settings['__permission_based__'][category]">
                        <div v-if="typeof value === 'object' && !defaultValue.startsWith('_')" class="p-0 pl-2 pr-2 " :key="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue + String(currentValue[permission.id] === null)">
                          <div class="d-flex pt-1 pb-1">
                            <textarea-from-array
                              v-if="currentValue.constructor === Array"
                              v-bind:value="getPermissionSettingsValue(permission.id, currentValue)"
                              v-bind:title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                              v-on:update="settings['__permission_based__'][category][defaultValue][permission.id] = $event; triggerDataChange()"
                              :readonly="currentValue[permission.id] === null"
                            ></textarea-from-array>
                            <toggle-enable
                              v-bind:title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                              v-else-if="typeof getPermissionSettingsValue(permission.id, currentValue) === 'boolean'"
                              v-bind:value="getPermissionSettingsValue(permission.id, currentValue)"
                              v-on:update="settings['__permission_based__'][category][defaultValue][permission.id] = $event; triggerDataChange()"
                              :disabled="currentValue[permission.id] === null"
                            ></toggle-enable>
                            <number-input
                              v-else-if="typeof getPermissionSettingsValue(permission.id, currentValue) === 'number'"
                              v-bind:type="typeof getPermissionSettingsValue(permission.id, currentValue)"
                              v-bind:value="getPermissionSettingsValue(permission.id, currentValue)"
                              min="0"
                              :readonly="currentValue[permission.id] === null"
                              v-bind:title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                              v-on:update="settings['__permission_based__'][category][defaultValue][permission.id] = $event.value; triggerDataChange()">
                            </number-input>
                            <text-input
                              v-else
                              v-bind:type="typeof getPermissionSettingsValue(permission.id, currentValue)"
                              v-bind:value="getPermissionSettingsValue(permission.id, currentValue)"
                              v-bind:title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                              :readonly="currentValue[permission.id] === null"
                              v-on:update="settings['__permission_based__'][category][defaultValue][permission.id] = $event.value; triggerDataChange()"
                            ></text-input>
                            <button class="btn" :class="[ currentValue[permission.id] === null ? 'btn-primary' : 'btn-secondary' ]"
                              v-if="permission.id !== '0efd7b1c-e460-4167-8e06-8aaf2c170311' /* VIEWERS */"
                              @click="togglePermissionLock(permission, currentValue); triggerDataChange()">
                              <fa v-if="currentValue[permission.id] === null" icon="lock"></fa>
                              <fa v-else icon="lock-open"></fa>
                            </button>
                          </div>
                        </div>
                      </template>
                    </b-card-text>
                  </b-tab>
                </b-tabs>
              </b-card>
            </div>
          </template>
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
            'overflow-x': 'hidden',
            'z-index': 0
            }">
          <div class="widget border-0 bg-light" style="height: auto">
          <div class="pl-2 pr-2 pb-4">
            <transition name="fade">
              <div v-show="isDataChanged" class="alert alert-warning" style="cursor: initial">
                <fa icon="exclamation-circle" class="mr-1"></fa>
                {{translate('dialog.changesPending')}}
              </div>
            </transition>
            <transition name="fade">
              <div class="alert alert-danger" v-show="error && showError" style="cursor: initial">
                <fa icon="exclamation-triangle" class="mr-1"></fa>
                {{ error }}
              </div>
            </transition>
            <button class="btn btn-block btn-primary" v-on:click="saveSettings" v-if="state.settings === 0">{{ translate('dialog.buttons.saveChanges.idle') }}</button>
            <button disabled="disabled" class="btn btn-block btn-primary" v-on:click="saveSettings" v-if="state.settings === 1">
              <fa icon="circle-notch" spin></fa> {{ translate('dialog.buttons.saveChanges.progress') }}</button>
            <button disabled="disabled" class="btn btn-block btn-success" v-on:click="saveSettings" v-if="state.settings === 2">
              <fa icon="check"></fa> {{ translate('dialog.buttons.saveChanges.done') }}</button>
            <button disabled="disabled" class="btn btn-block btn-danger" v-on:click="saveSettings" v-if="state.settings === 3">
              <fa icon="check"></fa>anslate('dialog.buttons.something-went-wrong') }}</button>
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
                <template v-if="system.enabled === null"></template>
                <template v-else-if="system.isDisabledByEnv">DISABLED BY ENV</template>
                <template v-else-if="!system.areDependenciesEnabled">DEPENDENCIES DISABLED</template>
                <template v-else-if="system.enabled === false">{{ translate('disabled') }}</template>
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
import { cloneDeep, get, pickBy, filter, size } from 'lodash-es';
import { flatten, unflatten } from 'src/bot/helpers/flatten';
import { getListOf } from 'src/panel/helpers/getListOf';
import { getSocket } from 'src/panel/helpers/socket';
import { OrderedMap, Map, fromJS } from 'immutable';

import { PermissionsInterface } from 'src/bot/database/entity/permissions';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

library.add(faExclamationTriangle)

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
    'cron': () => import('./components/interface/cron.vue'),
    'global-ignorelist-exclude': () => import('./components/interface/global-ignorelist-exclude.vue'),
    'heist-levels': () => import('./components/interface/heist-levels.vue'),
    'heist-results': () => import('./components/interface/heist-results.vue'),
    'helpbox': () => import('./components/interface/helpbox.vue'),
    'highlights-url-generator': () => import('./components/interface/highlights-url-generator.vue'),
    'loading': () => import('../../components/loading.vue'),
    'number-input': () => import('./components/interface/number-input.vue'),
    'selector': () => import('./components/interface/selector.vue'),
    'socket-list': () => import('./components/interface/socket-list.vue'),
    'sortable-list': () => import('./components/interface/sortable-list.vue'),
    'text-input': () => import('./components/interface/text-input.vue'),
    'textarea-from-array': () => import('./components/interface/textarea-from-array.vue'),
    'uuid-generator': () => import('./components/interface/uuid-generator.vue'),
    'toggle-enable': () => import('../../components/toggle-enable.vue'),
    }
})
export default class interfaceSettings extends Vue {
  @Prop() readonly commons: any;

  socket: SocketIOClient.Socket = getSocket('/');
  psocket: SocketIOClient.Socket = getSocket('/core/permissions');
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

  permissions: PermissionsInterface[] = [];

  get settingsWithoutPermissions() {
    const all = Map(fromJS(this.settings)).filter((value, key) => {
      return !(key as string).includes('permission') && key !== 'settings' && key !== 'general' && key !== 'commands'
    }).sortBy((value, key) => key);

    console.log(all.toJS())

    return OrderedMap()
      .mergeDeepIn(['settings'], Map(fromJS(this.settings.settings)))
      .mergeDeepIn(['general'], Map(fromJS(this.settings.general)))
      .merge(fromJS(Object.keys(this.settings.__permission_based__ || {}).sort().reduce((a, b) => {
          return { ...a, [b]: null }
        }, {}))) // generate null values for permission_based settings
      .merge(all)
      .mergeDeepIn(['commands'], Map(fromJS(this.settings.commands)))
      .toJS()
  }

  mounted() {
    this.refresh();

    this.heightOfMenuInterval = window.setInterval(() => {
      this.heightOfMenuUpdate()
    }, 1000)

    this.psocket.emit('permissions', (data) => {
      this.permissions = data
    })
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

  showIfCheck(toCheck) {
    let shouldBeShown = true;
    const flattenSettings = flatten(this.settings);
    for (const [key, value] of Object.entries(toCheck)) {
      const settingsKey = Object.keys(flattenSettings).find((flattenKey) => {
        return flattenKey.includes(key)
      })
      if (settingsKey) {
        if ((value as string).includes('lengthAtLeast')) {
          const lengthAtLeast = (value as string).match(/lengthAtLeast\((?<length>\d+)\)/);
          if (lengthAtLeast) {
            shouldBeShown = (value as string).length >= Number(lengthAtLeast.groups?.length);
            break;
          } else {
            shouldBeShown = false;
            break;
          }
        } else if (flattenSettings[settingsKey] !== value) {
          shouldBeShown = false;
          break;
        }
      }
    }
    return shouldBeShown;
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
    getSocket(`/${this.$route.params.type}/${system}`)
      .emit('settings', (err, _settings, _ui) => {
        if (system !== this.$route.params.id) return // skip if we quickly changed system

        this.state.loaded = State.DONE
        _settings = Object.entries(_settings);
        _ui = Object.entries(_ui);

        let settings: any = { settings: {} }
        let ui: any = { settings: {} }

        // sorting
        // enabled is first - remove on core/overlay
        if (!['core', 'overlays'].includes(this.$route.params.type)) {
          const enabled = _settings.find(o => {
            return o[0] === 'enabled'
          })
          if (enabled.length > 0) {
            settings.settings.enabled = enabled[1]
          }
        }

        // everything else except commands and enabled and are string|number|bool
        for (let [name, value] of filter(_settings, o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && o[0] !== 'general' && typeof o[1] !== 'object')) {
          settings.settings[name] = value
        }
        // everything else except commands and enabled and are objects -> own category
        for (let [name, value] of filter(_settings, o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1] === 'object')) {
          settings[name] = value
        }

        // commands at last
        for (let [name, value] of filter(_settings, o => o[0] === 'commands')) {
          settings[name] = value
        }

        // ui
        // everything else except commands and enabled and are string|number|bool
        for (let [name, value] of filter(_ui, o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1].type !== 'undefined')) {
          if (typeof settings.settings[name] === 'undefined') settings.settings[name] = null
          ui.settings[name] = value
        }

        // everything else except commands and enabled and are objects -> own category
        for (let [name, value] of filter(_ui, o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1].type === 'undefined')) {
          if (typeof settings[name] === 'undefined') settings[name] = {}
          for (let [k, /* v */] of Object.entries(value)) {
            if (typeof settings[name][k] === 'undefined') settings[name][k] = null
          }
          ui[name] = value
        }
        this.isDataChanged = false;

        // remove empty categories
        Object.keys(settings).forEach(key => {
          if (size(settings[key]) === 0) {
            delete settings[key]
          }
        })

        Object.keys(ui).forEach(key => {
          if (size(ui[key]) === 0) {
            delete ui[key]
          }
        })
        console.debug({ui, settings});

        for (const k of Object.keys(settings)) {
          // dont update _permissions as they might be null
          if (k !== '_permissions') {
            settings[k] = pickBy(settings[k], (value, key) => {
              return value !== null || get(ui, `${k}.${key}`, null) !== null;
            });
            if (Object.keys(settings[k]).length === 0) {
              delete settings[k]
            }
          }
        };
        console.debug({ui, settings});
        this.settings = Object.assign({}, settings);
        this.ui = Object.assign({}, ui)
      })
  }

  saveSettings() {
    this.state.settings = 1
    let settings = cloneDeep(this.settings)

    if (settings.settings) {
      for (let [name,value] of Object.entries(settings.settings)) {
        delete settings.settings[name]
        settings[name] = value
      }
      delete settings.settings
    }

    // flat permission based variables - getting rid of category
    settings.__permission_based__ = flatten(settings.__permission_based__)
    for (const key of Object.keys(settings.__permission_based__)) {
      const match = key.match(/\./g);
      if (match && match.length > 1) {
        const value = settings.__permission_based__[key];
        delete settings.__permission_based__[key]
        const keyWithoutCategory = key.replace(/([\w]*\.)/, '');
        console.debug(`FROM: ${key}`);
        console.debug(`TO:   ${keyWithoutCategory}`);
        settings.__permission_based__[keyWithoutCategory] = value;
      };
    }
    settings.__permission_based__ = unflatten(settings.__permission_based__)

    console.debug('Saving settings', settings);
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit('settings.update', settings, async (err) => {
        setTimeout(() => this.state.settings = 0, 1000)
        if (err) {
          this.state.settings = 3
          console.error(err)
        } else {
          this.state.settings = 2
          this.isDataChanged = false

          // Update prototypes
          Vue.prototype.$core = await getListOf('core');
          Vue.prototype.$systems = await getListOf('systems');
          Vue.prototype.$integrations = await getListOf('integrations');
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

  getPermissionSettingsValue(permId, values) {
    const startingOrder = get(this.permissions.find(permission => permission.id === permId), 'order', this.permissions.length);
    for (let i = startingOrder; i <= this.permissions.length; i++) {
      const value = values[get(this.permissions.find(permission => permission.order === i), 'id', '0efd7b1c-e460-4167-8e06-8aaf2c170311' /* viewers */)];
      if (typeof value !== 'undefined' && value !== null) {
        return value
      }
    }

    // if order is last -> mirror viewers values
    console.error(`Value for ${permId} not found in ${JSON.stringify(values)}`);
    return values['0efd7b1c-e460-4167-8e06-8aaf2c170311' /* viewers */];
  }

  togglePermissionLock(permission, currentValue) {
    if(currentValue[permission.id] === null) {
      currentValue[permission.id] = this.getPermissionSettingsValue(permission.id, currentValue)
    } else {
      currentValue[permission.id] = null
    }
  }
}
</script>