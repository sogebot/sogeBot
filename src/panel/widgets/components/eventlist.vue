<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
          li.nav-item
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-eventlist')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-group(header="Events filtering")
                b-dropdown-form
                  b-button(@click="toggle('widgetEventlistFollows')" :variant="settings.widgetEventlistFollows ? 'success' : 'danger'")
                    fa(icon="heart")
                  b-button(@click="toggle('widgetEventlistHosts')" :variant="settings.widgetEventlistHosts ? 'success' : 'danger'")
                    fa(icon="tv")
                  b-button(@click="toggle('widgetEventlistRaids')" :variant="settings.widgetEventlistRaids ? 'success' : 'danger'")
                    fa(icon="random")
                  b-button(@click="toggle('widgetEventlistCheers')" :variant="settings.widgetEventlistCheers ? 'success' : 'danger'")
                    fa(icon="gem")
                  b-button(@click="toggle('widgetEventlistSubs')" :variant="settings.widgetEventlistSubs ? 'success' : 'danger'")
                    fa(icon="star")
                  b-button(@click="toggle('widgetEventlistSubgifts')" :variant="settings.widgetEventlistSubgifts ? 'success' : 'danger'")
                    fa(icon="gift")
                  b-button(@click="toggle('widgetEventlistSubcommunitygifts')" :variant="settings.widgetEventlistSubcommunitygifts ? 'success' : 'danger'")
                    fa(icon="box-open")
                  b-button(@click="toggle('widgetEventlistResubs')" :variant="settings.widgetEventlistResubs ? 'success' : 'danger'")
                    font-awesome-layers
                      fa(icon="star-half")
                      fa(icon="long-arrow-alt-right")
                  b-button(@click="toggle('widgetEventlistTips')" :variant="settings.widgetEventlistTips ? 'success' : 'danger'")
                    fa(icon="dollar-sign")
              template(v-if="!popout")
                b-dropdown-divider
                b-dropdown-item(@click="state.editation = $state.progress")
                  | Edit events
                b-dropdown-item(target="_blank" href="/popout/#eventlist")
                  | Popout
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'eventlist'))").text-danger
                    | Remove <strong>{{translate('widget-title-eventlist')}}</strong> widget

        b-tab(active)
          template(v-slot:title)
            fa(:icon='["far", "calendar"]' fixed-width)
          b-card-text
            loading(v-if="state.loading === $state.progress")
            template(v-else)
              div(v-if="state.editation === $state.progress").text-right
                b-button(variant="danger" @click="removeSelected" :disabled="selected.length === 0")
                  fa(icon="trash-alt")
                b-button(variant="primary" @click="editationDone")
                  | Done
              b-list-group
                b-list-group-item(
                  @mouseover="isHovered = event.id"
                  @mouseleave="isHovered = ''"
                  v-for="(event, index) of fEvents"
                  :key="index"
                  :active="selected.includes(event.id)"
                  style="cursor: pointer; border-left: 0; border-right: 0; padding: 0.2rem 1.25rem 0.4rem 1.25rem"
                  :style="{opacity: event.isTest ? 0.75 : 1}"
                  @click="state.editation !== $state.idle ? toggleSelected(event) : null"
                )
                  i(:title="moment(event.timestamp).format('LLLL')").eventlist-text
                    span(v-if="event.isTest").text-danger TEST
                    |
                    | {{moment(event.timestamp).fromNow()}}
                  div(:style="{'font-size': eventlistSize + 'px'}").eventlist-username
                    div.d-flex
                      div.w-100
                        span(:title="event.username" style="z-index: 9") {{event.username}}
                        span(v-html="prepareMessage(event)").pl-1
                      div(style="flex-shrink: 15;")
                        span(v-if="isHovered !== event.id || state.editation !== $state.idle")
                          fa(v-if="event.event === 'follow'" icon="heart" :class="[`icon-${event.event}`, 'icon']")
                          fa(v-if="event.event === 'host'" icon="tv" :class="[`icon-${event.event}`, 'icon']")
                          fa(v-if="event.event === 'raid'" icon="random" :class="[`icon-${event.event}`, 'icon']")
                          fa(v-if="event.event === 'sub'" icon="star" :class="[`icon-${event.event}`, 'icon']")
                          fa(v-if="event.event === 'subgift'" icon="gift" :class="[`icon-${event.event}`, 'icon']")
                          fa(v-if="event.event === 'subcommunitygift'" icon="box-open" :class="[`icon-${event.event}`, 'icon']")
                          font-awesome-layers(v-if="event.event === 'resub'" :class="[`icon-${event.event}`, 'icon']")
                            fa(icon="star-half")
                            fa(icon="long-arrow-alt-right")
                          fa(v-if="event.event === 'cheer'" icon="gem" :class="[`icon-${event.event}`, 'icon']")
                          fa(v-if="event.event === 'tip'" icon="dollar-sign" :class="[`icon-${event.event}`, 'icon']")
                        span(v-else)
                          fa(icon="redo-alt" :class="['icon']" @click="resendAlert(event.id)").pointer
        b-tab
          template(v-slot:title)
            fa(icon="cog" fixed-width)
          b-card-text
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('eventlist-show-number')}}
              input(type="text" v-model="eventlistShow").form-control
              div.input-group-append
                span.input-group-text {{translate('eventlist-show')}}
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('followers-size')}}
              input(type="text" v-model="eventlistSize").form-control
              div.input-group-append
                span.input-group-text px
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('followers-message-size')}}
              input(type="text" v-model="eventlistMessageSize").form-control
              div.input-group-append
                span.input-group-text px
            hold-button(icon="eraser" @trigger="cleanup()").mt-2.btn.btn-danger.w-100
              template(slot="title") Cleanup
              template(slot="onHoldTitle") Hold to cleanup
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { EventBus } from 'src/panel/helpers/event-bus';
import { toBoolean } from 'src/bot/helpers/toBoolean';
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { chunk, debounce, get } from 'lodash-es';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faRedoAlt } from '@fortawesome/free-solid-svg-icons';
library.add(faRedoAlt);

import moment from 'moment';
export default {
  props: ['popout', 'nodrag'],
  components: {
    'font-awesome-layers': FontAwesomeLayers,
    holdButton: () => import('../../components/holdButton.vue'),
    loading: () => import('src/panel/components/loading.vue'),
  },
  data: function () {
    return {
      EventBus,
      isHovered: '',
      socket: getSocket('/widgets/eventlist'),
      settings: {
        widgetEventlistFollows: true,
        widgetEventlistHosts: true,
        widgetEventlistRaids: true,
        widgetEventlistCheers: true,
        widgetEventlistSubs: true,
        widgetEventlistSubgifts: true,
        widgetEventlistSubcommunitygifts: true,
        widgetEventlistResubs: true,
        widgetEventlistTips: true,
      },
      state: {
        editation: this.$state.idle,
        loading: this.$state.progress,
      },
      events: [],
      eventlistShow: 0,
      eventlistSize: 0,
      eventlistMessageSize: 0,
      interval: [],
      selected: [],
    }
  },
  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  },
  created: function () {
    this.state.loading = this.$state.progress
    this.settings = {
      widgetEventlistFollows: toBoolean(localStorage.getItem('widgetEventlistFollows') ?? true),
      widgetEventlistHosts: toBoolean(localStorage.getItem('widgetEventlistHosts') ?? true),
      widgetEventlistRaids: toBoolean(localStorage.getItem('widgetEventlistRaids') ?? true),
      widgetEventlistCheers: toBoolean(localStorage.getItem('widgetEventlistCheers') ?? true),
      widgetEventlistSubs: toBoolean(localStorage.getItem('widgetEventlistSubs') ?? true),
      widgetEventlistSubgifts: toBoolean(localStorage.getItem('widgetEventlistSubgifts') ?? true),
      widgetEventlistSubcommunitygifts: toBoolean(localStorage.getItem('widgetEventlistSubcommunitygifts') ?? true),
      widgetEventlistResubs: toBoolean(localStorage.getItem('widgetEventlistResubs') ?? true),
      widgetEventlistTips: toBoolean(localStorage.getItem('widgetEventlistTips') ?? true),
    }

    this.eventlistShow = Number(localStorage.getItem('widgetEventlistShow') ?? 5),
    this.eventlistSize = Number(localStorage.getItem('widgetEventlistSize') ?? 20),
    this.eventlistMessageSize = Number(localStorage.getItem('widgetEventlistMessageSize') ?? 15),
    console.group('Eventlist widgets settings')
    console.debug(this.settings)
    console.groupEnd()
    this.socket.emit('eventlist::get', this.eventlistShow) // get initial widget state
    this.socket.on('askForGet', () => this.socket.emit('eventlist::get', this.eventlistShow));
    this.socket.on('update', events => {
      this.state.loading = this.$state.success
      this.events = events
    })

    // refresh timestamps
    this.interval.push(setInterval(() => this.socket.emit('eventlist::get', this.eventlistShow), 60000))
  },
  computed: {
    fEvents: function () {
      let toShow = []
      if (this.settings.widgetEventlistFollows) toShow.push('follow')
      if (this.settings.widgetEventlistHosts) toShow.push('host')
      if (this.settings.widgetEventlistRaids) toShow.push('raid')
      if (this.settings.widgetEventlistCheers) toShow.push('cheer')
      if (this.settings.widgetEventlistSubs) toShow.push('sub')
      if (this.settings.widgetEventlistSubgifts) toShow.push('subgift')
      if (this.settings.widgetEventlistSubcommunitygifts) toShow.push('subcommunitygift')
      if (this.settings.widgetEventlistResubs) toShow.push('resub')
      if (this.settings.widgetEventlistTips) toShow.push('tip')
      return chunk(this.events.filter(o => toShow.includes(o.event)), this.eventlistShow)[0]
    }
  },
  watch: {
    'state.editation': function (val) {
      this.selected = []
    },
    eventlistSize: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) this.eventlistSize = old
      else {
        this.eventlistSize = value
        localStorage.setItem('widgetEventlistSize', value)
      }
    }, 500),
    eventlistShow: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) this.eventlistShow = old
      else {
        this.eventlistShow = value
        localStorage.setItem('widgetEventlistShow', value)
        this.socket.emit('eventlist::get', this.eventlistShow) // get initial widget state
      }
    }, 500),
    eventlistMessageSize: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) this.eventlistMessageSize = old
      else {
        this.eventlistMessageSize = value
        localStorage.setItem('widgetEventlistMessageSize', value)
      }
    }, 500),
  },
  methods: {
    removeSelected() {
      this.socket.emit('eventlist::removeById', this.selected, () => {});
      this.events = this.events.filter(o => !this.selected.includes(o.id))
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
      console.log('Cleanup => eventlist')
      this.socket.emit('cleanup')
      this.events = []
    },
    prepareMessage: function (event) {
      let t = this.translate(`eventlist-events.${event.event}`)

      // change resub translate if not shared substreak
      if (event.event === 'resub' && !event.subStreakShareEnabled) {
        t = this.translate(`eventlist-events.resubWithoutStreak`);
      }

      const values = JSON.parse(event.values_json)
      t = t.replace('$formatted_amount', '<strong style="font-size: 1rem">' + get(values, 'currency', '$') + parseFloat(get(values, 'amount', '0')).toFixed(2) + '</strong>')
      t = t.replace('$viewers', '<strong style="font-size: 1rem">' + get(values, 'viewers', '0') + '</strong>')
      t = t.replace('$tier', `${this.translate('tier')} <strong style="font-size: 1rem">${get(values, 'tier', 'n/a')}</strong>`)
      t = t.replace('$username', get(values, 'from', 'n/a'))
      t = t.replace('$subCumulativeMonthsName', get(values, 'subCumulativeMonthsName', 'months'))
      t = t.replace('$subCumulativeMonths', '<strong style="font-size: 1rem">' + get(values, 'subCumulativeMonths', '0') + '</strong>')
      t = t.replace('$subStreakName', get(values, 'subStreakName', 'months'))
      t = t.replace('$subStreak', '<strong style="font-size: 1rem">' + get(values, 'subStreak', '0') + '</strong>')
      t = t.replace('$bits', '<strong style="font-size: 1rem">' + get(values, 'bits', '0') + '</strong>')
      t = t.replace('$count', '<strong style="font-size: 1rem">' + get(values, 'count', '0') + '</strong>')

      let output = `<span style="font-size:0.7rem; font-weight: normal">${t}</span>`
      if (values.song_url && values.song_title) output += `<div style="font-size: 0.7rem"><strong>${this.translate('song-request')}:</strong> <a href="${values.song_url}">${values.song_title}</a></div>`
      if (values.message) output += `<div class="eventlist-blockquote" style="font-size: ${this.eventlistMessageSize}px">${values.message.replace(/(\w{10})/g, '$1<wbr>')}</div>` // will force new line for long texts

      return output
    },
    moment: function (args) {
      return moment(args) // expose moment function
    },
    toggle: function (id) {
      this.settings[id] = !this.settings[id];
      localStorage.setItem(id, this.settings[id]);
    }
  }
}
</script>
