<template>
  <div
    ref="window"
    class="container-fluid"
  >
    <loading v-if="!$route.params.id" />
    <div
      v-else
      class="row"
    >
      <div class="col-lg-9 col-md-8 col-sm-6">
        <span class="title text-default mb-2">
          {{ translate('menu.settings') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.' + $route.params.type) }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.' + $route.params.id) }}
        </span>

        <loading v-if="state.loaded !== 2 /* State.DONE */" />
        <template
          v-for="(value, category) of settingsWithoutPermissions"
          v-else
        >
          <h6 :key="category + '#1'">
            {{ translate('categories.' + category) }}
          </h6>
          <div
            v-if="value !== null"
            :key="category + '#2'"
            class="card mb-2"
          >
            <div class="card-body">
              <template v-for="(currentValue, defaultValue) of value">
                <div
                  v-if="typeof value === 'object' && !defaultValue.startsWith('_')"
                  :key="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                  class="p-0 pl-2 pr-2 "
                >
                  <template v-if="typeof ui[category] !== 'undefined' && typeof ui[category][defaultValue] !== 'undefined'">
                    <sortable-list
                      v-if="ui[category][defaultValue].type === 'sortable-list'"
                      :values="value[ui[category][defaultValue].values]"
                      :toggle="value[ui[category][defaultValue].toggle]"
                      :toggleonicon="ui[category][defaultValue].toggleOnIcon"
                      :toggleofficon="ui[category][defaultValue].toggleOffIcon"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      class="pt-1 pb-1"
                      @update="value[ui[category][defaultValue].toggle] = $event.toggle; value[defaultValue] = $event.value; triggerDataChange()"
                    />
                    <highlights-url-generator
                      v-else-if="ui[category][defaultValue].type === 'highlights-url-generator'"
                      :values="currentValue"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      @update="value[defaultValue] = $event.value; triggerDataChange()"
                    />
                    <a
                      v-else-if="ui[category][defaultValue].type === 'link'"
                      :href="ui[category][defaultValue].href"
                      class="mt-1 mb-1"
                      :class="ui[category][defaultValue].class"
                      :target="ui[category][defaultValue].target"
                    >
                      <template v-if="ui[category][defaultValue].rawText">{{ ui[category][defaultValue].rawText }}</template>
                      <template v-else>{{ translate(ui[category][defaultValue].text) }}</template>
                    </a>
                    <component
                      :is="ui[category][defaultValue].type"
                      v-else
                      :full-object.sync="ui[category][defaultValue]"
                      :readonly="ui[category][defaultValue].readOnly"
                      :secret="ui[category][defaultValue].secret"
                      :step="ui[category][defaultValue].step"
                      :min="ui[category][defaultValue].min"
                      :max="ui[category][defaultValue].max"
                      :class="ui[category][defaultValue].class"
                      :emit="ui[category][defaultValue].emit"
                      :settings="settingsWithoutPermissions"
                      :value="currentValue"
                      :values="ui[category][defaultValue].values"
                      :default-value="defaultValues[defaultValue]"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      :current="value[ui[category][defaultValue].current]"
                      class="pt-1 pb-1"
                      @update="value[defaultValue] = $event.value; triggerDataChange()"
                    />
                  </template>
                  <template v-else>
                    <command-input-with-permission
                      v-if="category === 'commands'"
                      class="pt-1 pb-1"
                      :type="typeof currentValue"
                      :value="currentValue"
                      :command="defaultValue"
                      :permissions="settings._permissions[defaultValue]"
                      @update="value[defaultValue] = $event.value; settings._permissions[defaultValue] = $event.permissions; triggerDataChange()"
                    />
                    <toggle-enable
                      v-else-if="typeof currentValue === 'boolean'"
                      class="pt-1 pb-1"
                      :title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                      :value="currentValue"
                      @update="value[defaultValue] = !value[defaultValue]; triggerDataChange()"
                    />
                    <textarea-from-array
                      v-else-if="currentValue.constructor === Array"
                      class="pt-1 pb-1"
                      :value="currentValue"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      @update="value[defaultValue] = $event.value; triggerDataChange()"
                    />
                    <number-input
                      v-else-if="typeof currentValue === 'number'"
                      class="pt-1 pb-1"
                      :type="typeof currentValue"
                      :default-value="defaultValues[defaultValue]"
                      :value="currentValue"
                      min="0"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      @update="value[defaultValue] = $event.value; triggerDataChange()"
                    />
                    <text-input
                      v-else
                      class="pt-1 pb-1"
                      :type="typeof currentValue"
                      :value="currentValue"
                      :default-value="defaultValues[defaultValue]"
                      :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                      @update="value[defaultValue] = $event.value; triggerDataChange()"
                    />
                  </template>
                </div>
              </template>
            </div>
          </div>
          <template v-if="permissions.length > 0 && Object.keys(settings).includes('__permission_based__') && settings['__permission_based__'][category]">
            <div :key="category + '__permission_based__#1'">
              <b-card no-body>
                <b-tabs
                  pills
                  card
                  vertical
                  lazy
                >
                  <!-- set lazy as it will force to repaint on click -->
                  <b-tab
                    v-for="permission of orderBy(getNotIgnoredPermissions(permissions, settings['__permission_based__'][category]), 'order', 'desc')"
                    :key="'b-tab' + category + permission.id"
                    :title="permission.name"
                  >
                    <b-card-text :key="'b-card-text' + category + permission.id">
                      <template v-for="(currentValue, defaultValue) of settings['__permission_based__'][category]">
                        <div
                          v-if="typeof value === 'object' && !defaultValue.startsWith('_')"
                          :key="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue + String(currentValue[permission.id] === null)"
                          class="p-0 pl-2 pr-2 "
                        >
                          <div class="d-flex pt-1 pb-1">
                            <textarea-from-array
                              v-if="currentValue.constructor === Array"
                              :value="getPermissionSettingsValue(permission.id, currentValue)"
                              :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                              :readonly="currentValue[permission.id] === null"
                              @update="settings['__permission_based__'][category][defaultValue][permission.id] = $event.value; triggerDataChange()"
                            />
                            <toggle-enable
                              v-else-if="typeof getPermissionSettingsValue(permission.id, currentValue) === 'boolean'"
                              :title="translate($route.params.type + '.' + $route.params.id + '.settings.' + defaultValue)"
                              :value="getPermissionSettingsValue(permission.id, currentValue)"
                              :disabled="currentValue[permission.id] === null"
                              @update="settings['__permission_based__'][category][defaultValue][permission.id] = $event.value; triggerDataChange()"
                            />
                            <number-input
                              v-else-if="typeof getPermissionSettingsValue(permission.id, currentValue) === 'number'"
                              :type="typeof getPermissionSettingsValue(permission.id, currentValue)"
                              :value="getPermissionSettingsValue(permission.id, currentValue)"
                              :default-value="defaultValues[defaultValue]"
                              min="0"
                              :readonly="currentValue[permission.id] === null"
                              :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                              @update="settings['__permission_based__'][category][defaultValue][permission.id] = $event.value; triggerDataChange()"
                            />
                            <text-input
                              v-else
                              :type="typeof getPermissionSettingsValue(permission.id, currentValue)"
                              :value="getPermissionSettingsValue(permission.id, currentValue)"
                              :default-value="defaultValues[defaultValue]"
                              :title="$route.params.type + '.' + $route.params.id + '.settings.' + defaultValue"
                              :readonly="currentValue[permission.id] === null"
                              @update="settings['__permission_based__'][category][defaultValue][permission.id] = $event.value; triggerDataChange()"
                            />
                            <button
                              v-if="permission.id !== '0efd7b1c-e460-4167-8e06-8aaf2c170311' /* VIEWERS */"
                              class="btn"
                              :class="[ currentValue[permission.id] === null ? 'btn-primary' : 'btn-secondary' ]"
                              @click="togglePermissionLock(permission, currentValue); triggerDataChange()"
                            >
                              <fa
                                v-if="currentValue[permission.id] === null"
                                icon="lock"
                              />
                              <fa
                                v-else
                                icon="lock-open"
                              />
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
            'sticky-top': $store.state.configuration.core.ui.stickystats,
            'pr-2': $store.state.configuration.core.ui.stickystats,
          }"
          class="pt-3"
          :style="{
            top: $store.state.configuration.core.ui.stickystats ? topOfMenu + 'px' : '',
            height: $store.state.configuration.core.ui.stickystats ? heightOfMenu : 'auto',
            overflow: $store.state.configuration.core.ui.stickystats ? 'scroll' : 'inherit',
            'overflow-x': 'hidden',
            'z-index': 0
          }"
        >
          <div
            class="widget border-0 bg-light"
            style="height: auto"
          >
            <div class="pl-2 pr-2 pb-4">
              <transition name="fade">
                <div
                  v-show="isDataChanged"
                  class="alert alert-warning"
                  style="cursor: initial"
                >
                  <fa
                    icon="exclamation-circle"
                    class="mr-1"
                  />
                  {{ translate('dialog.changesPending') }}
                </div>
              </transition>
              <transition name="fade">
                <div
                  v-show="error && showError"
                  class="alert alert-danger"
                  style="cursor: initial"
                >
                  <fa
                    icon="exclamation-triangle"
                    class="mr-1"
                  />
                  {{ error }}
                </div>
              </transition>
              <button
                v-if="state.settings === 0"
                class="btn btn-block btn-primary"
                @click="saveSettings"
              >
                {{ translate('dialog.buttons.saveChanges.idle') }}
              </button>
              <button
                v-if="state.settings === 1"
                disabled="disabled"
                class="btn btn-block btn-primary"
                @click="saveSettings"
              >
                <fa
                  icon="circle-notch"
                  spin
                /> {{ translate('dialog.buttons.saveChanges.progress') }}
              </button>
              <button
                v-if="state.settings === 2"
                disabled="disabled"
                class="btn btn-block btn-success"
                @click="saveSettings"
              >
                <svg
                  width="1.3em"
                  height="1.3em"
                  viewBox="0 0 16 16"
                  class="bi bi-check2-circle"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    d="M15.354 2.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L8 9.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M8 2.5A5.5 5.5 0 1 0 13.5 8a.5.5 0 0 1 1 0 6.5 6.5 0 1 1-3.25-5.63.5.5 0 1 1-.5.865A5.472 5.472 0 0 0 8 2.5z"
                  />
                </svg>
                {{ translate('dialog.buttons.saveChanges.done') }}
              </button>
              <button
                v-if="state.settings === 3"
                disabled="disabled"
                class="btn btn-block btn-danger"
                @click="saveSettings"
              >
                <svg
                  width="1.3em"
                  height="1.3em"
                  viewBox="0 0 16 16"
                  class="bi bi-exclamation"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
                </svg>
                {{ translate('dialog.buttons.something-went-wrong') }}
              </button>
            </div>

            <div
              v-for="system of list"
              :key="system.name"
              class="pl-2 pr-2"
            >
              <button
                class="btn btn-block text-left btn-outline-dark"
                :style="getBorderStyle(system.name)"
                @click="setSelected(system.name)"
              >
                {{ translate('menu.' + system.name) }}

                <small
                  v-if="!['core', 'overlays'].includes($route.params.type)"
                  :class="[ system.enabled && !system.isDisabledByEnv && system.areDependenciesEnabled ? 'text-success' : 'text-danger' ]"
                  style="margin: 0px 0px 3px; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px;"
                >
                  <template v-if="system.enabled === null" />
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
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { getConfiguration, getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  cloneDeep, filter, get, orderBy, pickBy, set, size,
} from 'lodash-es';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';

import { PermissionsInterface } from 'src/bot/database/entity/permissions';
import { flatten, unflatten } from 'src/bot/helpers/flatten';
import { getListOf } from 'src/panel/helpers/getListOf';

library.add(faExclamationTriangle);

type systemFromIO = { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean };
enum State {
  NONE, PROGRESS, DONE, ERROR
}

@Component({
  components: {
    'btn-emit':                      () => import('./components/interface/btn-emit.vue'),
    'checklist':                     () => import('./components/interface/checklist.vue'),
    'command-input-with-permission': () => import('./components/interface/command-input-with-permission.vue'),
    'configurable-list':             () => import('./components/interface/configurable-list.vue'),
    'credits-custom-texts':          () => import('./components/interface/credits-custom-texts.vue'),
    'credits-social':                () => import('./components/interface/credits-social.vue'),
    'cron':                          () => import('./components/interface/cron.vue'),
    'discord-guild':                 () => import('./components/interface/discord-guild.vue'),
    'discord-channel':               () => import('./components/interface/discord-channel.vue'),
    'discord-mapping':               () => import('./components/interface/discord-mapping.vue'),
    'emote-combo':                   () => import('./components/interface/emote-combo.vue'),
    'global-ignorelist-exclude':     () => import('./components/interface/global-ignorelist-exclude.vue'),
    'heist-levels':                  () => import('./components/interface/heist-levels.vue'),
    'heist-results':                 () => import('./components/interface/heist-results.vue'),
    'helpbox':                       () => import('./components/interface/helpbox.vue'),
    'highlights-url-generator':      () => import('./components/interface/highlights-url-generator.vue'),
    'levels-showcase':               () => import('./components/interface/levels-showcase.vue'),
    'loading':                       () => import('../../components/loading.vue'),
    'number-input':                  () => import('./components/interface/number-input.vue'),
    'selector':                      () => import('./components/interface/selector.vue'),
    'sortable-list':                 () => import('./components/interface/sortable-list.vue'),
    'spotify-device-input':          () => import('./components/interface/spotify-device-input.vue'),
    'streamelements-jwt':            () => import('./components/interface/streamelements-jwt.vue'),
    'text-input':                    () => import('./components/interface/text-input.vue'),
    'textarea-from-array':           () => import('./components/interface/textarea-from-array.vue'),
    'uuid-generator':                () => import('./components/interface/uuid-generator.vue'),
    'voice':                         () => import('./components/interface/voice.vue'),
    'toggle-enable':                 () => import('./components/interface/toggle-enable.vue'),
    'pubg-player-id':                () => import('./components/interface/pubg-player-id.vue'),
    'pubg-season-id':                () => import('./components/interface/pubg-season-id.vue'),
    'pubg-stats':                    () => import('./components/interface/pubg-stats.vue'),
    'pubg-customization':            () => import('./components/interface/pubg-customization.vue'),
  },
})
export default class interfaceSettings extends Vue {
  @Prop() readonly commons: any;

  orderBy = orderBy;
  translate = translate;

  socket = getSocket('/');
  psocket = getSocket('/core/permissions');
  list: systemFromIO[] = [];
  state: { loaded: State; settings: State } = { loaded: State.NONE, settings: State.NONE };
  settings: any = {};
  defaultValues: any = {};
  ui: any = {};
  isDataChanged = false;
  isDataChangedCheck = true;
  update = {};
  error: string | null = null;
  showError = false;

  topOfMenu = 168;
  heightOfMenu = '0';
  heightOfMenuInterval = 0;

  permissions: PermissionsInterface[] = [];

  isPermissionCategoryIgnored(permission: { [x: string]: any }, permId: string) {
    const keys = Object.keys(permission);
    if (keys.length > 0) {
      return permission[keys[0]][permId] === '%%%%___ignored___%%%%';
    }
    return false;
  }

  getNotIgnoredPermissions(permissions: Required<PermissionsInterface>[], data: { [x: string]: any }) {
    return permissions.filter(o => {
      return !this.isPermissionCategoryIgnored(data, o.id);
    });
  }

  get settingsWithoutPermissions() {
    let withoutPermissions: any = {};
    Object.keys(this.settings).filter(o => !o.includes('permission')).forEach((key) => {
      withoutPermissions[key] = this.settings[key];
    });
    for (const k of Object.keys(this.settings.__permission_based__ || {})) {
      withoutPermissions = {
        [k]: null,
        ...withoutPermissions,
      };
    }

    // set settings as first and commands as last
    const settings = withoutPermissions.settings; delete withoutPermissions.settings;
    const commands = withoutPermissions.commands; delete withoutPermissions.commands;
    let ordered: { [x: string]: string | null } = {};
    Object.keys(withoutPermissions).sort().forEach(function(key) {
      ordered[key] = withoutPermissions[key];
    });
    if (settings) {
      ordered = {
        settings,
        ...ordered,
      };
    }
    if (commands) {
      ordered = {
        ...ordered,
        commands,
      };
    }
    return ordered;
  }

  mounted() {
    this.refresh();

    this.heightOfMenuInterval = window.setInterval(() => {
      this.heightOfMenuUpdate();
    }, 1000);

    this.psocket.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
      if(err) {
        return console.error(err);
      }
      this.permissions = data;
    });
  }

  destroyed() {
    clearInterval(this.heightOfMenuInterval);
  }

  heightOfMenuUpdate() {
    this.heightOfMenu = String(window.innerHeight - Math.max((<HTMLElement>this.$refs.menu).getBoundingClientRect().top, this.topOfMenu) - 50) + 'px';
  }

  @Watch('$route.params.type')
  async refresh() {
    this.socket.emit(this.$route.params.type, (err: string | null, systems: systemFromIO[] ) => {
      const sortedSystems = systems.sort((a, b) => {
        return translate('menu.' + a.name).localeCompare(translate('menu.' + b.name));
      });
      if (!sortedSystems.map(o => o.name).includes(this.$route.params.id)) {
        this.$router.push({ name: 'InterfaceSettings', params: { type: this.$route.params.type, id: sortedSystems[0].name } });
        this.loadSettings(sortedSystems[0].name);
      } else if (this.$route.params.id) {
        this.loadSettings(this.$route.params.id);
      }
      this.list = sortedSystems;
    });
    this.$store.commit('setConfiguration', await getConfiguration()); // force refresh config
  }

  getBorderStyle(system: string) {
    return system === this.$route.params.id
      ? {
        'border-width':      '0px',
        'border-left-width': '5px !important',
      }
      : {
        'border-width':      '0px',
        'border-left-width': '5px !important',
        'border-color':      'transparent',
      };
  }

  setSelected(system: string) {
    this.$router.push({ name: 'InterfaceSettings', params: { type: this.$route.params.type, id: system } });
  }

  @Watch('$route.params.id')
  loadSettings(system: string) {
    if (!this.$route.params.id) {
      return this.refresh();
    }

    this.state.loaded = State.PROGRESS;
    getSocket(`/${this.$route.params.type}/${system}`)
      .emit('settings', (err: string | null, _settings: { [x: string]: any }, _ui: { [x: string]: { [attr: string]: any } }) => {
        if (system !== this.$route.params.id) {
          return;
        } // skip if we quickly changed system

        this.isDataChangedCheck = false;

        const settingsEntries = Object.entries(_settings);
        const uiEntries = Object.entries(_ui);
        console.groupCollapsed(`settings for ${system}`);
        console.log(_settings);
        console.groupEnd();

        const settings: any = { settings: {} };
        const ui: any = { settings: {} };

        // sorting
        // enabled is first - remove on core/overlay
        if (!['core', 'overlays'].includes(this.$route.params.type)) {
          const enabled = settingsEntries.find(o => {
            return o[0] === 'enabled';
          });
          if (enabled) {
            settings.settings.enabled = enabled[1];
          }
        }

        // everything else except commands and enabled and are [string|number|bool, string|number|bool]
        for (const [name, value] of filter(settingsEntries, o => o[0][0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && Array.isArray(o[1]))) {
          settings.settings[name] = value[0];
          this.defaultValues[name] = value[1];
        }
        // everything else except commands and enabled and are objects -> own category
        for (const [category, obj] of filter(settingsEntries, o => o[0][0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && !Array.isArray(o[1]))) {
          for (const [name, value] of Object.entries(obj)) {
            set(settings, `${category}.${name}`, (value as any)[0]);
            this.defaultValues[name] = (value as any)[1];
          }
        }

        // permission based
        for (const [_name, value] of filter(settingsEntries, o => o[0] === '__permission_based__')) {
          for (const category of Object.keys(value)) {
            for (const key of Object.keys(value[category])) {
              if (!settings.__permission_based__) {
                settings.__permission_based__ = { ...settings.__permission_based__, [category]: {} };
              }
              settings.__permission_based__[category] = { ...settings.__permission_based__[category], [key]: value[category][key][0] };
              this.defaultValues[key] = value[category][key][1];
            }
          }
        }

        // commands at last
        for (const [_name, value] of filter(settingsEntries, o => o[0] === 'commands')) {
          for (const key of Object.keys(value)) {
            settings.commands = { ...settings.commands, [key]: value[key][0] };
            this.defaultValues[key] = (value[key] as any)[1];
          }
        }
        // command permissions
        for (const [_key, value] of filter(settingsEntries, o => o[0] === '_permissions')) {
          for (const key of Object.keys(value)) {
            settings._permissions = { ...settings._permissions, [key]: value[key] };
          }
        }

        // ui
        // everything else except commands and enabled and are string|number|bool
        for (const [name, value] of filter(uiEntries, o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1].type !== 'undefined')) {
          if (typeof settings.settings[name] === 'undefined') {
            settings.settings[name] = null;
          }
          ui.settings[name] = value;
        }

        // everything else except commands and enabled and are objects -> own category
        for (const [name, value] of filter(uiEntries, o => o[0] !== '_' && o[0] !== 'enabled' && o[0] !== 'commands' && typeof o[1].type === 'undefined')) {
          if (typeof settings[name] === 'undefined') {
            settings[name] = {};
          }
          for (const [k /* v */] of Object.entries(value)) {
            if (typeof settings[name][k] === 'undefined') {
              settings[name][k] = null;
            }
          }
          ui[name] = value;
        }

        // remove empty categories
        Object.keys(settings).forEach(key => {
          if (size(settings[key]) === 0) {
            delete settings[key];
          }
        });

        Object.keys(ui).forEach(key => {
          if (size(ui[key]) === 0) {
            delete ui[key];
          }
        });
        console.debug({ ui, settings });

        for (const k of Object.keys(settings)) {
          // dont update _permissions as they might be null
          if (k !== '_permissions') {
            settings[k] = pickBy(settings[k], (value, key) => {
              return value !== null || get(ui, `${k}.${key}`, null) !== null;
            });
            if (Object.keys(settings[k]).length === 0) {
              delete settings[k];
            }
          }
        }
        console.debug({ ui, settings });
        this.settings = Object.assign({}, settings);
        this.ui = Object.assign({}, ui);
        this.state.loaded = State.DONE;
        this.isDataChanged = false;

        setTimeout(() => {
          this.isDataChangedCheck = true;
        }, 1000);
      });
  }

  saveSettings() {
    this.state.settings = 1;
    let settings = cloneDeep(this.settings);

    if (settings.settings) {
      for (const [name,value] of Object.entries(settings.settings)) {
        delete settings.settings[name];
        settings[name] = value;
      }
      delete settings.settings;
    }

    // flat variables - getting rid of category
    settings = flatten(settings);
    for (const key of Object.keys(settings)) {
      if (key.includes('__permission_based__') || key.includes('commands') || key.includes('_permission')) {
        continue;
      }

      const value = settings[key];
      const keyWithoutCategory = key.replace(/([\w]*\.)/, '');
      delete settings[key];
      console.debug(`FROM: ${key}`);
      console.debug(`TO:   ${keyWithoutCategory}`);
      settings[keyWithoutCategory] = value;
    }
    settings = unflatten(settings);

    // flat permission based variables - getting rid of category
    if(settings.__permission_based__) {
      settings.__permission_based__ = flatten(settings.__permission_based__);
      for (const key of Object.keys(settings.__permission_based__)) {
        const match = key.match(/\./g);
        if (match && match.length > 1) {
          const value = settings.__permission_based__[key];
          delete settings.__permission_based__[key];
          const keyWithoutCategory = key.replace(/([\w]*\.)/, '');
          console.debug(`FROM: ${key}`);
          console.debug(`TO:   ${keyWithoutCategory}`);
          settings.__permission_based__[keyWithoutCategory] = value;
        }
      }
      settings.__permission_based__ = unflatten(settings.__permission_based__);
    }

    console.debug('Saving settings', settings);
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit('settings.update', settings, async (err: string | null) => {
        setTimeout(() => this.state.settings = 0, 1000);
        if (err) {
          this.state.settings = 3;
          console.error(err);
        } else {
          this.state.settings = 2;
          this.isDataChanged = false;

          // Update prototypes
          Vue.prototype.$core = await getListOf('core');
          Vue.prototype.$systems = await getListOf('systems');
          Vue.prototype.$integrations = await getListOf('integrations');
        }
        setTimeout(() => {
          this.refresh();
        });
      });
  }

  triggerError (error: string) {
    this.error = error;
    this.showError = true;
    setTimeout(() => this.showError = false, 2000);
  }
  triggerDataChange() {
    if (this.state.loaded !== this.$state.progress && this.isDataChangedCheck) {
      this.isDataChanged = false; this.isDataChanged = true;
    }
  }

  getPermissionSettingsValue(permId: string, values: { [x: string]: string | null }) {
    const startingOrder = get(this.permissions.find(permission => permission.id === permId), 'order', this.permissions.length);
    for (let i = startingOrder; i <= this.permissions.length; i++) {
      const value = values[get(this.permissions.find(permission => permission.order === i), 'id', '0efd7b1c-e460-4167-8e06-8aaf2c170311' /* viewers */)];
      if (typeof value !== 'undefined' && value !== null) {
        return value;
      }
    }

    // if order is last -> mirror viewers values
    console.debug(`Value for ${permId} not found in ${JSON.stringify(values)}`);
    return values['0efd7b1c-e460-4167-8e06-8aaf2c170311' /* viewers */];
  }

  togglePermissionLock(permission: Required<PermissionsInterface>, currentValue: { [x: string]: string | null }) {
    if(currentValue[permission.id] === null) {
      currentValue[permission.id] = this.getPermissionSettingsValue(permission.id, currentValue);
    } else {
      currentValue[permission.id] = null;
    }
  }
}
</script>
