<template>
  <div
    ref="window"
    class="container-flid"
  >
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.goals') }}
          <small><fa icon="angle-right" /></small>
          <template v-if="$route.params.id">
            {{ group.name }}
            <small
              class="text-muted text-monospace"
              style="font-size:0.7rem"
            >{{ $route.params.id }}</small>
          </template>
          <template v-else>{{ translate('registry.goals.newGoalGroup') }}</template>
        </span>
      </div>
    </div>

    <panel>
      <template #left>
        <button-with-icon
          class="btn-secondary btn-reverse"
          icon="caret-left"
          href="#/registry/goals/list"
        >
          {{ translate('commons.back') }}
        </button-with-icon>
        <hold-button
          v-if="$route.params.id || null"
          icon="trash"
          class="btn-danger"
          @trigger="del()"
        >
          <template slot="title">
            {{ translate('dialog.buttons.delete') }}
          </template>
          <template slot="onHoldTitle">
            {{ translate('dialog.buttons.hold-to-delete') }}
          </template>
        </hold-button>
      </template>
      <template #right>
        <state-button
          text="saveChanges"
          :state="state.save"
          @click="save()"
        />
      </template>
    </panel>

    <div class="pt-3">
      <form :key="'goals-edit-form-' + group.id">
        <div class="form-group col-md-12">
          <label for="name_input">{{ translate('registry.goals.input.nameGroup.title') }}</label>
          <input
            id="name_input"
            v-model="group.name"
            type="text"
            class="form-control"
            :placeholder="translate('registry.goals.input.name.placeholder')"
          >
          <small class="form-text text-muted">{{ translate('registry.goals.input.nameGroup.help') }}</small>
          <div class="invalid-feedback" />
        </div>

        <div class="col-md-12">
          <div
            class="card col-md-12 mb-3 p-0"
            style="max-height: fit-content;"
          >
            <div class="card-header">
              {{ translate('registry.goals.groupSettings') }}
            </div>
            <div class="card-body">
              <div class="form-group col-md-12">
                <label for="type_selector">{{ translate('registry.goals.input.displayAs.title') }}</label>
                <select
                  v-model="group.display.type"
                  class="form-control"
                >
                  <option
                    v-for="display of groupDisplayOpts"
                    :key="display"
                    :value="display"
                  >
                    {{ display }}
                  </option>
                </select>
                <small class="form-text text-muted">{{ translate('registry.goals.input.displayAs.help') }}</small>
              </div>

              <template v-if="group.display.type === 'multi'">
                <div class="form-group col-md-12">
                  <label>{{ translate('registry.goals.input.spaceBetweenGoalsInPx.title') }}</label>
                  <input
                    v-model="group.display.spaceBetweenGoalsInPx"
                    min="0"
                    type="number"
                    class="form-control"
                    :placeholder="translate('registry.goals.input.spaceBetweenGoalsInPx.placeholder')"
                  >
                  <small class="form-text text-muted">{{ translate('registry.goals.input.spaceBetweenGoalsInPx.help') }}</small>
                  <div class="invalid-feedback" />
                </div>
              </template>

              <template v-if="group.display.type === 'fade'">
                <div class="form-group col-md-12">
                  <label>{{ translate('registry.goals.input.durationMs.title') }}</label>
                  <input
                    v-model="group.display.durationMs"
                    min="1000"
                    type="number"
                    class="form-control"
                    :placeholder="translate('registry.goals.input.durationMs.placeholder')"
                  >
                  <small class="form-text text-muted">{{ translate('registry.goals.input.durationMs.help') }}</small>
                  <div class="invalid-feedback" />
                </div>
                <div class="form-group col-md-12">
                  <label>{{ translate('registry.goals.input.animationInMs.title') }}</label>
                  <input
                    v-model="group.display.animationInMs"
                    min="1000"
                    type="number"
                    class="form-control"
                    :placeholder="translate('registry.goals.input.animationInMs.placeholder')"
                  >
                  <small class="form-text text-muted">{{ translate('registry.goals.input.animationInMs.help') }}</small>
                  <div class="invalid-feedback" />
                </div>
                <div class="form-group col-md-12">
                  <label>{{ translate('registry.goals.input.animationOutMs.title') }}</label>
                  <input
                    v-model="group.display.animationOutMs"
                    min="1000"
                    type="number"
                    class="form-control"
                    :placeholder="translate('registry.goals.input.animationOutMs.placeholder')"
                  >
                  <small class="form-text text-muted">{{ translate('registry.goals.input.animationOutMs.help') }}</small>
                  <div class="invalid-feedback" />
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="container-flid">
          <div class="card-deck pl-3 pr-3 justify-content-end">
            <div
              class="card col-2 p-0 m-0"
              style="max-height: fit-content;"
            >
              <div class="card-header">
                {{ translate('registry.goals.goals') }}
              </div>
              <div class="card-body p-0 m-0">
                <div class="list-group list-group-flush">
                  <button
                    v-for="goal of group.goals"
                    :key="goal.id"
                    type="button"
                    class="list-group-item list-group-item-action"
                    :class="{ active: uiShowGoal === goal.id }"
                    @click="uiShowGoal = goal.id"
                  >
                    <i v-if="goal.name === ''">
                      &nbsp;
                    </i>
                    <template v-else>
                      {{ goal.name }}
                    </template>
                  </button>
                  <button
                    type="button"
                    class="border-0 list-group-item list-group-item-dark"
                    tabindex="-1"
                    aria-disabled="true"
                    @click="addGoal"
                  >
                    <fa
                      icon="plus"
                      fixed-width
                    /> {{ translate('registry.goals.addGoal') }}
                  </button>
                </div>
              </div>
            </div>
            <template v-if="uiShowGoal !== '' && currentGoal">
              <div class="col-10 pr-0">
                <div
                  class="card col-12 p-0 m-0"
                  style="max-height: fit-content;"
                >
                  <div class="card-header">
                    <span style="position: relative; top: 0.3rem">{{ translate('registry.goals.general') }}</span>
                    <hold-button
                      class="btn-danger float-right"
                      icon="trash"
                      @trigger="removeGoal(uiShowGoal)"
                    >
                      <template slot="title">
                        {{ translate('dialog.buttons.delete') }}
                      </template>
                      <template slot="onHoldTitle">
                        {{ translate('dialog.buttons.hold-to-delete') }}
                      </template>
                    </hold-button>
                  </div>
                  <div class="card-body">
                    <div class="form-group col-md-12">
                      <label for="name">{{ translate('registry.goals.input.name.title') }}</label>
                      <input
                        id="name_input"
                        v-model="currentGoal.name"
                        type="text"
                        class="form-control"
                        :placeholder="translate('registry.goals.input.name.placeholder')"
                      >
                      <div class="invalid-feedback" />
                    </div>

                    <div class="form-group col-md-12">
                      <label for="type_selector">{{ translate('registry.goals.input.type.title') }}</label>
                      <select
                        v-model="currentGoal.type"
                        class="form-control"
                      >
                        <option
                          v-for="type of typeOpts"
                          :key="type"
                          :value="type"
                        >
                          {{ type }}
                        </option>
                      </select>
                    </div>

                    <div
                      v-if="currentGoal.type === 'tips'"
                      class="form-group col-md-12"
                    >
                      <label for="countBitsAsTips-input">{{ translate('registry.goals.input.countBitsAsTips.title') }}</label>
                      <button
                        type="button"
                        class="btn btn-block"
                        :class="[currentGoal.countBitsAsTips ? 'btn-success' : 'btn-danger']"
                        @click="$set(currentGoal, 'countBitsAsTips', !currentGoal.countBitsAsTips)"
                      >
                        {{ translate((currentGoal.countBitsAsTips ? 'enabled' : 'disabled')) }}
                      </button>
                    </div>

                    <div class="form-group col-md-12">
                      <label for="goalAmount-input">{{ translate('registry.goals.input.goalAmount.title') }}</label>
                      <input
                        id="goalAmount-input"
                        v-model="currentGoal.goalAmount"
                        type="number"
                        min="1"
                        class="form-control"
                      >
                      <div class="invalid-feedback" />
                    </div>

                    <div
                      v-if="!currentGoal.type.includes('current')"
                      class="form-group col-md-12"
                    >
                      <label for="currentAmount-input">{{ translate('registry.goals.input.currentAmount.title') }}</label>
                      <input
                        id="currentAmount-input"
                        v-model="currentGoal.currentAmount"
                        type="number"
                        min="0"
                        class="form-control"
                      >
                      <div class="invalid-feedback" />
                    </div>

                    <div class="form-group col-md-12">
                      <label for="endAfterIgnore-input">{{ translate('registry.goals.input.endAfterIgnore.title') }}</label>
                      <button
                        type="button"
                        class="btn btn-block"
                        :class="[currentGoal.endAfterIgnore ? 'btn-success' : 'btn-danger']"
                        @click="$set(currentGoal, 'endAfterIgnore', !currentGoal.endAfterIgnore)"
                      >
                        {{ translate((currentGoal.endAfterIgnore ? 'enabled' : 'disabled')) }}
                      </button>
                    </div>

                    <div
                      v-if="!currentGoal.endAfterIgnore"
                      class="form-group col-md-12"
                    >
                      <label for="endAfter-input">{{ translate('registry.goals.input.endAfter.title') }}</label>
                      <datetime
                        v-model="currentGoal.endAfter"
                        class="form-control"
                        :config="dateTimePicker"
                      />
                    </div>
                  </div>
                </div>

                <div
                  :key="'goals-html-' + currentGoal.id"
                  class="card col-12 mt-2 p-0 m-0"
                >
                  <div class="card-header">
                    {{ translate('registry.goals.display') }}
                  </div>
                  <div class="card-body">
                    <div class="form-group col-md-12">
                      <label for="type_selector">{{ translate('registry.goals.input.type.title') }}</label>
                      <select
                        v-model="currentGoal.display"
                        class="form-control"
                      >
                        <option
                          v-for="display of displayOpts"
                          :key="display"
                          :value="display"
                        >
                          {{ display }}
                        </option>
                      </select>
                      <div class="invalid-feedback" />
                    </div>

                    <div
                      v-if="currentGoal.display ==='custom'"
                      class="btn-group col-md-12"
                      role="group"
                    >
                      <button
                        type="button"
                        class="btn"
                        :class="[customShow === 'html' ? 'btn-dark' : 'btn-outline-dark']"
                        @click="customShow = 'html'"
                      >
                        HTML
                      </button>
                      <button
                        type="button"
                        class="btn"
                        :class="[customShow === 'css' ? 'btn-dark' : 'btn-outline-dark']"
                        @click="customShow = 'css'"
                      >
                        CSS
                      </button>
                      <button
                        type="button"
                        class="btn"
                        :class="[customShow === 'js' ? 'btn-dark' : 'btn-outline-dark']"
                        @click="customShow = 'js'"
                      >
                        JS
                      </button>
                    </div>
                    <div
                      v-if="currentGoal.display ==='custom'"
                      class="col-md-12"
                    >
                      <codemirror
                        v-if="customShow === 'html'"
                        v-model="currentGoal.customizationHtml"
                        style="font-size: 1.1em;"
                        class="w-100"
                        :options="{
                          tabSize: 4,
                          mode: 'text/html',
                          theme: 'base16-' + theme,
                          lineNumbers: true,
                          line: true,
                        }"
                      />
                      <codemirror
                        v-if="customShow === 'js'"
                        v-model="currentGoal.customizationJs"
                        style="font-size: 1.1em;"
                        class="w-100"
                        :options="{
                          tabSize: 4,
                          mode: 'text/javascript',
                          theme: 'base16-' + theme,
                          lineNumbers: true,
                          line: true,
                        }"
                      />
                      <codemirror
                        v-if="customShow === 'css'"
                        v-model="currentGoal.customizationCss"
                        style="font-size: 1.1em;"
                        class="w-100"
                        :options="{
                          tabSize: 4,
                          mode: 'text/css',
                          theme: 'base16-' + theme,
                          lineNumbers: true,
                          line: true,
                        }"
                      />
                    </div>
                  </div>
                </div>

                <font
                  v-if="currentGoal.display !== 'custom'"
                  :key="'goals-edit-fonts-' + currentGoal.id"
                  :data.sync="currentGoal.customizationFont"
                  class="col-12 mt-2 p-0 m-0"
                />

                <div
                  v-if="currentGoal.display !== 'custom'"
                  :key="'goals-barSettings' + currentGoal.id"
                  class="card col-12 mt-2 p-0 m-0"
                >
                  <div class="card-header">
                    {{ translate('registry.goals.barSettings') }}
                  </div>
                  <div class="card-body">
                    <div class="row pl-3 pr-3">
                      <div class="form-group col-md-3">
                        <label
                          class="w-100"
                          for="bar_borderPx_input"
                        >{{ translate('registry.goals.input.borderPx.title') }}</label>
                        <input
                          id="bar_borderPx_input"
                          v-model="currentGoal.customizationBar.borderPx"
                          type="text"
                          class="form-control"
                        >
                        <small class="form-text text-muted">{{ translate('registry.goals.input.borderPx.help') }}</small>
                        <div class="invalid-feedback" />
                      </div>
                      <div class="form-group col-md-3">
                        <label
                          class="w-100"
                          for="bar_height_input"
                        >{{ translate('registry.goals.input.barHeight.title') }}</label>
                        <input
                          id="bar_height_input"
                          v-model="currentGoal.customizationBar.height"
                          type="number"
                          min="1"
                          class="form-control"
                        >
                        <small class="form-text text-muted">{{ translate('registry.goals.input.barHeight.help') }}</small>
                        <div class="invalid-feedback" />
                      </div>

                      <div class="form-group col-md-6">
                        <div class="row pl-3 pr-3">
                          <label
                            class="w-100"
                            for="bar_color_input"
                          >{{ translate('registry.goals.input.color.title') }}</label>
                          <input
                            id="bar_color_input"
                            v-model="currentGoal.customizationBar.color"
                            type="text"
                            class="form-control col-10"
                          >
                          <input
                            v-model="currentGoal.customizationBar.color"
                            type="color"
                            class="form-control col-2"
                          >
                        </div>

                        <div class="row pl-3 pr-3 pt-2">
                          <label
                            class="w-100"
                            for="bar_color_input"
                          >{{ translate('registry.goals.input.borderColor.title') }}</label>
                          <input
                            id="bar_borderColor_input"
                            v-model="currentGoal.customizationBar.borderColor"
                            type="text"
                            class="form-control col-10"
                          >
                          <input
                            v-model="currentGoal.customizationBar.borderColor"
                            type="color"
                            class="form-control col-2"
                          >
                        </div>

                        <div class="row pl-3 pr-3 pt-2">
                          <label
                            class="w-100"
                            for="bar_color_input"
                          >{{ translate('registry.goals.input.backgroundColor.title') }}</label>
                          <input
                            id="bar_backgroundColor_input"
                            v-model="currentGoal.customizationBar.backgroundColor"
                            type="text"
                            class="form-control col-10"
                          >
                          <input
                            v-model="currentGoal.customizationBar.backgroundColor"
                            type="color"
                            class="form-control col-2"
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <div
              v-else
              class="alert col-10 p-0"
            >
              <div class="alert alert-info ml-3">
                {{ translate('registry.goals.selectGoalOnLeftSide') }}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import { get } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import Vue from 'vue';
import { codemirror } from 'vue-codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/lib/codemirror.css';
import VueFlatPickr from 'vue-flatpickr-component';
import 'flatpickr/dist/flatpickr.css';

import { GoalGroupInterface, GoalInterface } from 'src/bot/database/entity/goal';

export default Vue.extend({
  components: {
    panel:      () => import('../../../components/panel.vue'),
    holdButton: () => import('../../../components/holdButton.vue'),
    font:       () => import('../../../components/font.vue'),
    datetime:   VueFlatPickr,
    codemirror,
  },
  data: function () {
    const object: {
      get: typeof get,
      translate: typeof translate,
      socket: any,
      search: string,
      groupId: string,
      group: Required<GoalGroupInterface>,
      fonts: string[],
      uiShowGoal: string,
      typeOpts: ['followers', 'currentFollowers', 'currentSubscribers', 'subscribers', 'tips', 'bits'],
      displayOpts: ['simple', 'full', 'custom'],
      groupDisplayOpts: ['fade', 'multi'],
      theme: string,

      customShow: string,
      state: {
        save: number
      },
      dateTimePicker: any,
    } = {
      get:       get,
      translate: translate,
      socket:    getSocket('/overlays/goals'),
      search:    '',
      groupId:   uuid(),
      group:     {
        id:        this.$route.params.id,
        name:      '',
        createdAt: Date.now(),
        display:   {
          type:                  'multi',
          spaceBetweenGoalsInPx: 10,
        },
        goals: [],
      },
      fonts:            [],
      uiShowGoal:       '',
      typeOpts:         ['followers', 'currentFollowers', 'currentSubscribers', 'subscribers', 'tips', 'bits'],
      displayOpts:      ['simple', 'full', 'custom'],
      groupDisplayOpts: ['fade', 'multi'],
      theme:            localStorage.getItem('theme') || get(this.$store.state, 'configuration.core.ui.theme', 'light'),

      customShow:     'html',
      state:          { save: 0 },
      dateTimePicker: {
        enableTime: true,
        altFormat:  'M	j, Y H:i',
        altInput:   true,
        dateFormat: 'Z',
      },
    };
    return object;
  },
  computed: {
    isEditation: function (): boolean {
      return this.$route.params.id !== null;
    },
    currentGoal: function (): GoalInterface | null {
      if (this.uiShowGoal === '') {
        return null;
      } else {
        return this.group.goals.find((o) => o.id === this.uiShowGoal) || null;
      }
    },
  },
  watch: {
    'group.display.type': function (val) {
      if (val === 'fade') {
        this.$set(this.group, 'display', {
          type:           'fade',
          animationInMs:  1000,
          animationOutMs: 1000,
          durationMs:     60000,
        });
      } else {
        this.$set(this.group, 'display', {
          type:                  val,
          spaceBetweenGoalsInPx: 10,
        });
      }
    },
  },
  mounted: async function () {
    if (this.$route.params.id) {
      this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, d: Required<GoalGroupInterface>) => {
        if (err) {
          console.error(err);
          return;
        }
        if (d === null || Object.keys(d).length === 0) {
          this.$router.push({ name: 'GoalsRegistryList' });
          return;
        }
        this.groupId = String(d.id);

        // workaround for missing weight after https://github.com/sogehige/sogeBot/issues/3871
        // workaround for missing shadow settings after https://github.com/sogehige/sogeBot/issues/3875
        for (const goal of d.goals) {
          goal.customizationFont.weight = goal.customizationFont.weight ?? 500;
          goal.customizationFont.shadow = goal.customizationFont.shadow ?? [];
        }

        this.group = d;

        if (this.uiShowGoal === '' && this.group.goals.length > 0) {
          this.uiShowGoal = this.group.goals[0].id ?? '';
        }
      });
    }
    const { response } = await new Promise<{ response: Record<string, any>}>(resolve => {
      const request = new XMLHttpRequest();
      request.open('GET', '/fonts', true);

      request.onload = function() {
        if (!(this.status >= 200 && this.status < 400)) {
          console.error('Something went wrong getting font', this.status, this.response);
        }
        resolve({ response: JSON.parse(this.response) });
      };
      request.onerror = function() {
        console.error('Connection error to sogebot');
        resolve( { response: {} });
      };

      request.send();
    });
    this.fonts = response.items.map((o: { family: string }) => {
      return { text: o.family, value: o.family };
    });
  },
  methods: {
    del: function () {
      this.socket.emit('goals::remove', this.group, (err: string | null) => {
        if (err) {
          console.error(err);
        } else {
          this.$router.push({ name: 'GoalsRegistryList' });
        }
      });
    },
    save: function () {
      this.state.save = 1;
      this.$forceUpdate();

      this.group.id = this.groupId;
      if (this.group.name.trim().length === 0) {
        this.group.name = [...Array(10)].map(() => Math.random().toString(36)[3]).join('');
      }

      this.socket.emit('goals::save', this.group, (err: string | null) => {
        if (err) {
          console.error(err);
        } else {
          this.state.save = 2;
        }
        this.$router.push({ name: 'GoalsRegistryEdit', params: { id: this.group.id } });
        setTimeout(() => {
          this.state.save = 0;
        }, 1000);
      });
    },
    removeGoal: function (id: string) {
      this.group.goals = this.group.goals.filter((o) => o.id !== id);
    },
    addGoal: function () {
      const id = uuid();
      this.group.goals.push({
        id,
        name: '',
        type: 'followers',

        display: 'full',

        customizationBar: {
          color:           '#00aa00',
          backgroundColor: '#e9ecef',
          borderColor:     '#000000',
          borderPx:        0,
          height:          50,
        },
        customizationFont: {
          family:      'PT Sans',
          weight:      500,
          color:       '#ffffff',
          size:        20,
          borderColor: '#000000',
          borderPx:    1,
          shadow:      [],
        },
        customizationHtml: '\n\t<!-- '
                + '\n\t\tAll html objects will be wrapped in the #wrap div'
                + '\n\t\tBootstrap classes are available'
                + '\n\t\tAvailable variables:'
                  + '\n\t\t\t$name - name of goal ; $type - type of goal ; $goalAmount - total amount'
                  + '\n\t\t\t$currentAmount - current amount ; $percentageAmount - how much is achieved ; $endAfter - when goal ends'
              + '\n\t-->'
              + '\n'
              + '\n\t<div class="row no-gutters">'
                + '\n\t\t<div class="col-4 text-left text-nowrap pl-2 pr-2">$name</div>'
                + '\n\t\t<div class="col-4 text-nowrap text-center">$currentAmount</div>'
                + '\n\t\t<div class="col-4 text-nowrap text-right pr-2">$goalAmount</div>'
              + '\n\t</div>'
              + '\n'
              + '\n\t<div class="progress">'
                + '\n\t\t<div class="progress-bar" role="progressbar" style="width: $percentageAmount%" aria-valuenow="$percentageAmount" aria-valuemin="0" aria-valuemax="$goalAmount"></div>'
              + '\n\t</div>'
              + '\n',
        customizationJs: '\n\tfunction onChange(currentAmount) {'
                + '\n\t\tconsole.log(\'new value is \' + currentAmount);'
              + '\n\t}'
              + '\n',
        customizationCss: '\n\t/* All html objects will be wrapped in the #wrap div */'
              + '\n\n\t#wrap .progress-bar {'
                + '\n\t\tbackground: black;'
              + '\n\t}'
              + '\n',
        timestamp:       Date.now(),
        goalAmount:      1000,
        currentAmount:   0,
        endAfter:        (new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString(),
        endAfterIgnore:  true,
        countBitsAsTips: false,
      });

      this.uiShowGoal = id;
    },
  },
});
</script>

<style scoped>
  .current {
    font-weight: bold;
    position: absolute;
    font-family: 'PT Sans Narrow', sans-serif;
    right: .4rem;
    font-size: 0.7rem;
    top: 0.2rem;
  }

  .options.first {
    padding-top: 1rem;
  }

  .options.last {
    padding-bottom: 1rem;
  }

  #footer {
    text-align: center;
  }

  .numbers {
    padding: 0 1rem 0 0;
    width: 1%;
  }

  .percentage {
    padding: 0;
    width: 80px;
    text-align: right;
  }

  .background-bar, .bar {
    position: relative;
    top: 1rem;
    height: 1rem;
    width: 100%;
  }

  .bar {
    position: relative;
    top: 0rem;
  }
</style>