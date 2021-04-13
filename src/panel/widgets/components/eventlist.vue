<template>
  <div class="widget">
    <b-card
      class="border-0 h-100"
      no-body="no-body"
    >
      <b-tabs
        class="h-100"
        pills="pills"
        card="card"
        style="overflow:hidden"
      >
        <template #tabs-start>
          <template v-if="!popout">
            <li
              v-if="typeof nodrag === 'undefined'"
              class="nav-item px-2 grip text-secondary align-self-center"
            >
              <fa
                icon="grip-vertical"
                fixed-width="fixed-width"
              />
            </li>
          </template>
          <li class="nav-item">
            <b-dropdown
              ref="dropdown"
              boundary="window"
              no-caret="no-caret"
              :text="translate('widget-title-eventlist')"
              variant="outline-primary"
              toggle-class="border-0"
            >
              <b-dropdown-group header="Events filtering">
                <b-dropdown-form>
                  <b-button
                    :variant="settings.widgetEventlistFollows ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistFollows')"
                  >
                    <fa icon="heart" />
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistHosts ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistHosts')"
                  >
                    <fa icon="tv" />
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistRaids ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistRaids')"
                  >
                    <fa icon="random" />
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistCheers ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistCheers')"
                  >
                    <fa icon="gem" />
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistSubs ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistSubs')"
                  >
                    <fa icon="star" />
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistSubgifts ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistSubgifts')"
                  >
                    <fa icon="gift" />
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistSubcommunitygifts ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistSubcommunitygifts')"
                  >
                    <fa icon="box-open" />
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistResubs ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistResubs')"
                  >
                    <font-awesome-layers>
                      <fa icon="star-half" />
                      <fa icon="long-arrow-alt-right" />
                    </font-awesome-layers>
                  </b-button>
                  <b-button
                    :variant="settings.widgetEventlistTips ? 'success' : 'danger'"
                    @click="toggle('widgetEventlistTips')"
                  >
                    <fa icon="dollar-sign" />
                  </b-button>
                </b-dropdown-form>
              </b-dropdown-group>
              <template v-if="!popout">
                <b-dropdown-divider />
                <b-dropdown-item @click="state.editation = $state.progress">
                  Edit events
                </b-dropdown-item>
                <b-dropdown-item
                  target="_blank"
                  href="/popout/#eventlist"
                >
                  {{ translate('popout') }}
                </b-dropdown-item>
                <b-dropdown-divider />
                <b-dropdown-item>
                  <a
                    class="text-danger"
                    href="#"
                    @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'eventlist'))"
                    v-html="translate('remove-widget').replace('$name', translate('widget-title-eventlist'))"
                  />
                </b-dropdown-item>
              </template>
            </b-dropdown>
          </li>
        </template>
        <b-tab active="active">
          <template #title>
            <fa
              :icon="['far', 'calendar']"
              fixed-width="fixed-width"
            />
          </template>
          <b-card-text>
            <loading v-if="state.loading === $state.progress" />
            <template v-else>
              <div
                v-if="state.editation === $state.progress"
                class="text-right"
              >
                <b-button
                  variant="danger"
                  :disabled="selected.length === 0"
                  @click="removeSelected"
                >
                  <fa icon="trash-alt" />
                </b-button>
                <b-button
                  variant="primary"
                  @click="editationDone"
                >
                  Done
                </b-button>
              </div>
              <b-list-group>
                <b-list-group-item
                  v-for="(event, index) of fEvents"
                  :key="index"
                  :active="selected.includes(event.id)"
                  style="cursor: pointer; border-left: 0; border-right: 0; padding: 0.2rem 1.25rem 0.4rem 1.25rem"
                  :style="{opacity: event.isTest ? 0.75 : 1}"
                  @mouseover="isHovered = event.id"
                  @mouseleave="isHovered = ''"
                  @click="state.editation !== $state.idle ? toggleSelected(event) : null"
                >
                  <i
                    class="eventlist-text"
                    :title="dayjs(event.timestamp).format('LLLL')"
                  ><span
                     v-if="event.isTest"
                     class="text-danger"
                   >TEST</span>
                    {{ dayjs(event.timestamp).fromNow() }}</i>
                  <div
                    class="eventlist-username"
                    :style="{'font-size': eventlistSize + 'px'}"
                  >
                    <div class="d-flex">
                      <div class="w-100">
                        <span
                          :title="event.username"
                          style="z-index: 9"
                        >{{ event.username }}</span><span
                          class="pl-1"
                          v-html="prepareMessage(event)"
                        />
                      </div>
                      <div style="flex-shrink: 15;">
                        <span v-if="isHovered !== event.id || state.editation !== $state.idle">
                          <fa
                            v-if="event.event === 'follow'"
                            icon="heart"
                            :class="[`icon-${event.event}`, 'icon']"
                          />
                          <fa
                            v-if="event.event === 'host'"
                            icon="tv"
                            :class="[`icon-${event.event}`, 'icon']"
                          />
                          <fa
                            v-if="event.event === 'raid'"
                            icon="random"
                            :class="[`icon-${event.event}`, 'icon']"
                          />
                          <fa
                            v-if="event.event === 'sub'"
                            icon="star"
                            :class="[`icon-${event.event}`, 'icon']"
                          />
                          <fa
                            v-if="event.event === 'subgift'"
                            icon="gift"
                            :class="[`icon-${event.event}`, 'icon']"
                          />
                          <fa
                            v-if="event.event === 'subcommunitygift'"
                            icon="box-open"
                            :class="[`icon-${event.event}`, 'icon']"
                          />
                          <font-awesome-layers
                            v-if="event.event === 'resub'"
                            :class="[`icon-${event.event}`, 'icon']"
                          >
                            <fa icon="star-half" />
                            <fa icon="long-arrow-alt-right" />
                          </font-awesome-layers>
                          <fa
                            v-if="event.event === 'cheer'"
                            icon="gem"
                            :class="[`icon-${event.event}`, 'icon']"
                          />
                          <fa
                            v-if="event.event === 'tip'"
                            icon="dollar-sign"
                            :class="[`icon-${event.event}`, 'icon']"
                          /></span><span v-else>
                          <fa
                            class="pointer"
                            icon="redo-alt"
                            :class="['icon']"
                            @click="resendAlert(event.id)"
                          /></span>
                      </div>
                    </div>
                  </div>
                </b-list-group-item>
              </b-list-group>
            </template>
          </b-card-text>
        </b-tab>
        <b-tab>
          <template #title>
            <fa
              icon="cog"
              fixed-width="fixed-width"
            />
          </template>
          <b-card-text>
            <div class="input-group">
              <div class="input-group-prepend">
                <span class="input-group-text">{{ translate('eventlist-show-number') }}</span>
              </div>
              <input
                v-model="eventlistShow"
                class="form-control"
                type="text"
              >
              <div class="input-group-append">
                <span class="input-group-text">{{ translate('eventlist-show') }}</span>
              </div>
            </div>
            <div class="input-group">
              <div class="input-group-prepend">
                <span class="input-group-text">{{ translate('followers-size') }}</span>
              </div>
              <input
                v-model="eventlistSize"
                class="form-control"
                type="text"
              >
              <div class="input-group-append">
                <span class="input-group-text">px</span>
              </div>
            </div>
            <div class="input-group">
              <div class="input-group-prepend">
                <span class="input-group-text">{{ translate('followers-message-size') }}</span>
              </div>
              <input
                v-model="eventlistMessageSize"
                class="form-control"
                type="text"
              >
              <div class="input-group-append">
                <span class="input-group-text">px</span>
              </div>
            </div>
            <hold-button
              class="mt-2 btn btn-danger w-100"
              icon="eraser"
              @trigger="cleanup()"
            >
              <template slot="title">
                Cleanup
              </template>
              <template slot="onHoldTitle">
                Hold to cleanup
              </template>
            </hold-button>
          </b-card-text>
        </b-tab>
        <template #tabs-end>
          <li
            class="nav-item text-right"
            style="flex-grow: 1;"
          >
            <b-button-group>
              <b-button
                id="eventlistAlertsSkipButton"
                class="border-0"
                :variant="'outline-dark'"
                @click="emitSkipAlertEvent()"
              >
                <fa
                  icon="forward"
                  fixed-width
                />
              </b-button>
              <b-button
                id="eventlistAlertsTTSButton"
                class="border-0"
                :variant="isTTSMuted ? 'outline-secondary' : 'outline-dark'"
                @click="isTTSMuted = !isTTSMuted"
              >
                <strong>TTS</strong>
              </b-button>
              <b-button
                id="eventlistSoundToggleButton"
                class="border-0"
                :variant="isSoundMuted ? 'outline-secondary' : 'outline-dark'"
                @click="isSoundMuted = !isSoundMuted"
              >
                <fa
                  v-if="!isSoundMuted"
                  icon="volume-up"
                  fixed-width
                />
                <fa
                  v-else
                  icon="volume-mute"
                  fixed-width
                />
              </b-button>
              <b-button
                id="eventlistAlertsToggleButton"
                class="border-0"
                :variant="areAlertsMuted ? 'outline-secondary' : 'outline-dark'"
                @click="areAlertsMuted = !areAlertsMuted"
              >
                <fa
                  v-if="!areAlertsMuted"
                  icon="bell"
                  fixed-width
                />
                <fa
                  v-else
                  icon="bell-slash"
                  fixed-width
                />
              </b-button>
            </b-button-group>
            <b-tooltip
              target="eventlistAlertsSkipButton"
              :title="'Skip alert'"
            />
            <b-tooltip
              target="eventlistAlertsTTSButton"
              :title="isTTSMuted ? 'TTS is disabled.' : 'TTS is enabled!'"
            />
            <b-tooltip
              target="eventlistSoundToggleButton"
              :title="isSoundMuted ? 'Sound is muted.' : 'Sound is enabled!'"
            />
            <b-tooltip
              target="eventlistAlertsToggleButton"
              :title="areAlertsMuted ? 'Alerts are disabled.' : 'Alerts are enabled!'"
            />
          </li>
        </template>
      </b-tabs>
    </b-card>
  </div>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faBell, faBellSlash, faRedoAlt, faVolumeMute,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  chunk, debounce, get,
} from 'lodash-es';

import { dayjs } from 'src/bot/helpers/dayjs';
import { toBoolean } from 'src/bot/helpers/toBoolean';
import { EventBus } from 'src/panel/helpers/event-bus';

library.add(faRedoAlt, faBell, faBellSlash, faVolumeMute);

export default {
  components: {
    'font-awesome-layers': FontAwesomeLayers,
    holdButton:            () => import('../../components/holdButton.vue'),
    loading:               () => import('src/panel/components/loading.vue'),
  },
  props: ['popout', 'nodrag'],
  data:  function () {
    return {
      translate,
      dayjs,
      EventBus,
      isHovered:    '',
      socket:       getSocket('/widgets/eventlist'),
      socketAlerts: getSocket('/registries/alerts'),
      settings:     {
        widgetEventlistFollows:           true,
        widgetEventlistHosts:             true,
        widgetEventlistRaids:             true,
        widgetEventlistCheers:            true,
        widgetEventlistSubs:              true,
        widgetEventlistSubgifts:          true,
        widgetEventlistSubcommunitygifts: true,
        widgetEventlistResubs:            true,
        widgetEventlistTips:              true,
      },
      state: {
        editation: this.$state.idle,
        loading:   this.$state.progress,
      },
      events:               [],
      eventlistShow:        0,
      eventlistSize:        0,
      eventlistMessageSize: 0,
      interval:             [],
      selected:             [],
      areAlertsMuted:       false,
      isTTSMuted:           false,
      isSoundMuted:         false,
    };
  },
  computed: {
    fEvents: function () {
      const toShow = [];
      if (this.settings.widgetEventlistFollows) {
        toShow.push('follow');
      }
      if (this.settings.widgetEventlistHosts) {
        toShow.push('host');
      }
      if (this.settings.widgetEventlistRaids) {
        toShow.push('raid');
      }
      if (this.settings.widgetEventlistCheers) {
        toShow.push('cheer');
      }
      if (this.settings.widgetEventlistSubs) {
        toShow.push('sub');
      }
      if (this.settings.widgetEventlistSubgifts) {
        toShow.push('subgift');
      }
      if (this.settings.widgetEventlistSubcommunitygifts) {
        toShow.push('subcommunitygift');
      }
      if (this.settings.widgetEventlistResubs) {
        toShow.push('resub');
      }
      if (this.settings.widgetEventlistTips) {
        toShow.push('tip');
      }
      return chunk(this.events.filter(o => toShow.includes(o.event)), this.eventlistShow)[0];
    },
  },
  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  },
  created: function () {
    this.state.loading = this.$state.progress;
    this.settings = {
      widgetEventlistFollows:           toBoolean(localStorage.getItem('widgetEventlistFollows') ? localStorage.getItem('widgetEventlistFollows') : true),
      widgetEventlistHosts:             toBoolean(localStorage.getItem('widgetEventlistHosts') ? localStorage.getItem('widgetEventlistHosts') : true),
      widgetEventlistRaids:             toBoolean(localStorage.getItem('widgetEventlistRaids') ? localStorage.getItem('widgetEventlistRaids') : true),
      widgetEventlistCheers:            toBoolean(localStorage.getItem('widgetEventlistCheers') ? localStorage.getItem('widgetEventlistCheers') : true),
      widgetEventlistSubs:              toBoolean(localStorage.getItem('widgetEventlistSubs') ? localStorage.getItem('widgetEventlistSubs') : true),
      widgetEventlistSubgifts:          toBoolean(localStorage.getItem('widgetEventlistSubgifts') ? localStorage.getItem('widgetEventlistSubgifts') : true),
      widgetEventlistSubcommunitygifts: toBoolean(localStorage.getItem('widgetEventlistSubcommunitygifts') ? localStorage.getItem('widgetEventlistSubcommunitygifts') : true),
      widgetEventlistResubs:            toBoolean(localStorage.getItem('widgetEventlistResubs') ? localStorage.getItem('widgetEventlistResubs') : true),
      widgetEventlistTips:              toBoolean(localStorage.getItem('widgetEventlistTips') ? localStorage.getItem('widgetEventlistTips') : true),
    };

    this.eventlistShow = Number(localStorage.getItem('widgetEventlistShow') ? localStorage.getItem('widgetEventlistShow') : 100),
    this.eventlistSize = Number(localStorage.getItem('widgetEventlistSize') ? localStorage.getItem('widgetEventlistSize') : 20),
    this.eventlistMessageSize = Number(localStorage.getItem('widgetEventlistMessageSize') ? localStorage.getItem('widgetEventlistMessageSize') : 15),
    console.group('Eventlist widgets settings');
    console.debug(this.settings);
    console.groupEnd();
    this.socket.emit('eventlist::get', this.eventlistShow); // get initial widget state
    this.socket.on('askForGet', () => this.socket.emit('eventlist::get', this.eventlistShow));
    this.socket.on('update', events => {
      this.state.loading = this.$state.success;
      this.events = events;
    });
    this.socketAlerts.emit('alerts::areAlertsMuted', null, (err, val) => {
      this.areAlertsMuted = val;
    });
    this.socketAlerts.emit('alerts::isTTSMuted', null, (err, val) => {
      this.isTTSMuted = val;
    });
    this.socketAlerts.emit('alerts::isSoundMuted', null, (err, val) => {
      this.isSoundMuted = val;
    });

    // refresh timestamps
    this.interval.push(setInterval(() => this.socket.emit('eventlist::get', this.eventlistShow), 60000));
  },
  watch: {
    '$route': function(val) {
      this.socketAlerts.emit('alerts::areAlertsMuted', null, (err, value) => {
        this.areAlertsMuted = value;
      });
      this.socketAlerts.emit('alerts::isTTSMuted', null, (err, value) => {
        this.isTTSMuted = value;
      });
      this.socketAlerts.emit('alerts::isSoundMuted', null, (err, value) => {
        this.isSoundMuted = value;
      });
    },
    'areAlertsMuted': function(val) {
      this.socketAlerts.emit('alerts::areAlertsMuted', this.areAlertsMuted, () => {
        return;
      });
    },
    'isTTSMuted': function(val) {
      this.socketAlerts.emit('alerts::isTTSMuted', this.isTTSMuted, () => {
        return;
      });
    },
    'isSoundMuted': function(val) {
      this.socketAlerts.emit('alerts::isSoundMuted', this.isSoundMuted, () => {
        return;
      });
    },
    'state.editation': function (val) {
      this.selected = [];
    },
    eventlistSize: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) {
        this.eventlistSize = old;
      } else {
        this.eventlistSize = value;
        localStorage.setItem('widgetEventlistSize', value);
      }
    }, 500),
    eventlistShow: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) {
        this.eventlistShow = old;
      } else {
        this.eventlistShow = value;
        localStorage.setItem('widgetEventlistShow', value);
        this.socket.emit('eventlist::get', this.eventlistShow); // get initial widget state
      }
    }, 500),
    eventlistMessageSize: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) {
        this.eventlistMessageSize = old;
      } else {
        this.eventlistMessageSize = value;
        localStorage.setItem('widgetEventlistMessageSize', value);
      }
    }, 500),
  },
  methods: {
    removeSelected() {
      this.socket.emit('eventlist::removeById', this.selected, () => {
        return;
      });
      this.events = this.events.filter(o => !this.selected.includes(o.id));
      this.selected = [];
    },
    editationDone() {
      this.state.editation = this.$state.idle;
      this.selected = [];
    },
    toggleSelected(item) {
      if(this.selected.find(o => o === item.id)) {
        this.selected = this.selected.filter(o => o !== item.id);
      } else {
        this.selected.push(item.id);
      }
    },
    resendAlert(id) {
      console.log(`resendAlert => ${id}`);
      this.socket.emit('eventlist::resend', id);
    },
    cleanup: function () {
      console.log('Cleanup => eventlist');
      this.socket.emit('cleanup');
      this.events = [];
    },
    prepareMessage: function (event) {
      let t = translate(`eventlist-events.${event.event}`);

      // change resub translate if not shared substreak
      if (event.event === 'resub' && !event.subStreakShareEnabled) {
        t = translate(`eventlist-events.resubWithoutStreak`);
      }

      const values = JSON.parse(event.values_json);
      const formatted_amount = Intl.NumberFormat(this.$store.state.configuration.lang, { style: 'currency', currency: get(values, 'currency', 'USD') }).format(get(values, 'amount', '0'));
      t = t.replace('$formatted_amount', '<strong style="font-size: 1rem">' + formatted_amount + '</strong>');
      t = t.replace('$viewers', '<strong style="font-size: 1rem">' + get(values, 'viewers', '0') + '</strong>');
      t = t.replace('$tier', `${translate('tier')} <strong style="font-size: 1rem">${get(values, 'tier', 'n/a')}</strong>`);
      t = t.replace('$username', get(values, 'fromId', 'n/a'));
      t = t.replace('$subCumulativeMonthsName', get(values, 'subCumulativeMonthsName', 'months'));
      t = t.replace('$subCumulativeMonths', '<strong style="font-size: 1rem">' + get(values, 'subCumulativeMonths', '0') + '</strong>');
      t = t.replace('$subStreakName', get(values, 'subStreakName', 'months'));
      t = t.replace('$subStreak', '<strong style="font-size: 1rem">' + get(values, 'subStreak', '0') + '</strong>');
      t = t.replace('$bits', '<strong style="font-size: 1rem">' + get(values, 'bits', '0') + '</strong>');
      t = t.replace('$count', '<strong style="font-size: 1rem">' + get(values, 'count', '0') + '</strong>');

      let output = `<span style="font-size:0.7rem; font-weight: normal">${t}</span>`;
      if (values.song_url && values.song_title) {
        output += `<div style="font-size: 0.7rem"><strong>${translate('song-request')}:</strong> <a href="${values.song_url}">${values.song_title}</a></div>`;
      }
      if (values.message) {
        output += `<div class="eventlist-blockquote" style="font-size: ${this.eventlistMessageSize}px">${values.message.replace(/(\w{10})/g, '$1<wbr>')}</div>`;
      } // will force new line for long texts

      return output;
    },
    toggle: function (id) {
      this.settings[id] = !this.settings[id];
      localStorage.setItem(id, this.settings[id]);
    },
    emitSkipAlertEvent() {
      console.log('Skipping current alert');
      this.socket.emit('skip');
    },
  },
};
</script>
