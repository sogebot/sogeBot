<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start v-if="!popout")
          li.nav-item.px-2.grip.text-secondary.align-self-center
            fa(icon="grip-vertical" fixed-width)
          li.nav-item
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-eventlist')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-group(header="Events filtering")
                b-dropdown-item-button(@click="toggle('widgetEventlistFollows')" :variant="settings.widgetEventlistFollows ? 'success' : 'danger'")
                  | Follows
                b-dropdown-item-button(@click="toggle('widgetEventlistHosts')" :variant="settings.widgetEventlistHosts ? 'success' : 'danger'")
                  | Hosts
                b-dropdown-item-button(@click="toggle('widgetEventlistRaids')" :variant="settings.widgetEventlistRaids ? 'success' : 'danger'")
                  | Raids
                b-dropdown-item-button(@click="toggle('widgetEventlistCheers')" :variant="settings.widgetEventlistCheers ? 'success' : 'danger'")
                  | Cheers
                b-dropdown-item-button(@click="toggle('widgetEventlistSubs')" :variant="settings.widgetEventlistSubs ? 'success' : 'danger'")
                  | Subs
                b-dropdown-item-button(@click="toggle('widgetEventlistSubgifts')" :variant="settings.widgetEventlistSubgifts ? 'success' : 'danger'")
                  | Sub Gifts
                b-dropdown-item-button(@click="toggle('widgetEventlistSubcommunitygifts')" :variant="settings.widgetEventlistSubcommunitygifts ? 'success' : 'danger'")
                  | Sub Community Gifts
                b-dropdown-item-button(@click="toggle('widgetEventlistResubs')" :variant="settings.widgetEventlistResubs ? 'success' : 'danger'")
                  | Resubs
                b-dropdown-item-button(@click="toggle('widgetEventlistTips')" :variant="settings.widgetEventlistTips ? 'success' : 'danger'")
                  | Tips
              b-dropdown-divider
              b-dropdown-item(href="/popout/#eventlist")
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
            b-list-group(v-else)
              b-list-group-item(
                v-for="(event, index) of fEvents"
                :key="index"
                style="border-left: 0; border-right: 0; padding: 0.2rem 1.25rem 0.4rem 1.25rem"
              )
                i(:title="moment(event.timestamp).format('LLLL')").eventlist-text
                  | {{moment(event.timestamp).fromNow()}}
                div(:style="{'font-size': eventlistSize + 'px'}").eventlist-username
                  div.d-flex
                    div.w-100
                      span(:title="event.username" style="z-index: 9") {{event.username}}
                      span(v-html="prepareMessage(event)").pl-1
                    div(style="flex-shrink: 15;")
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
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { chunk, debounce, get, isNil } from 'lodash-es';
import moment from 'moment';
export default {
  props: ['popout'],
  components: {
    'font-awesome-layers': FontAwesomeLayers,
    holdButton: () => import('../../components/holdButton.vue'),
    loading: () => import('src/panel/components/loading.vue'),
  },
  data: function () {
    return {
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
        loading: this.$state.progress,
      },
      update: String(new Date()),
      events: [],
      eventlistShow: 0,
      eventlistSize: 0,
      eventlistMessageSize: 0,
      interval: [],
    }
  },
  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  },
  mounted: function () {
    this.$emit('mounted')

    $('#eventlistDropdown').on('show.bs.dropdown', function() {
      $('body').append($('#eventlistDropdownData .dropdown-force-visible').css({
        position: 'absolute',
        left: $('#eventlistDropdownData').offset().left,
        top: $('#eventlistDropdownData').offset().top + 5
      }).detach())
    })
  },
  created: function () {
    this.state.loading = this.$state.progress
    this.socket.emit('settings', (e, data) => {
      this.settings = {
        widgetEventlistFollows: isNil(data.widgetEventlistFollows) ? true : data.widgetEventlistFollows,
        widgetEventlistHosts: isNil(data.widgetEventlistHosts) ? true : data.widgetEventlistHosts,
        widgetEventlistRaids: isNil(data.widgetEventlistRaids) ? true : data.widgetEventlistRaids,
        widgetEventlistCheers: isNil(data.widgetEventlistCheers) ? true : data.widgetEventlistCheers,
        widgetEventlistSubs: isNil(data.widgetEventlistSubs) ? true : data.widgetEventlistSubs,
        widgetEventlistSubgifts: isNil(data.widgetEventlistSubgifts) ? true : data.widgetEventlistSubgifts,
        widgetEventlistSubcommunitygifts: isNil(data.widgetEventlistSubcommunitygifts) ? true : data.widgetEventlistSubcommunitygifts,
        widgetEventlistResubs: isNil(data.widgetEventlistResubs) ? true : data.widgetEventlistResubs,
        widgetEventlistTips: isNil(data.widgetEventlistTips) ? true : data.widgetEventlistTips
      }

      this.eventlistShow = data.widgetEventlistShow
      this.eventlistSize = data.widgetEventlistSize,
      this.eventlistMessageSize = data.widgetEventlistMessageSize
      console.group('Eventlist widgets settings')
      console.debug(this.settings)
      console.groupEnd()
    })
    this.socket.emit('get') // get initial widget state
    this.socket.on('update', events => {
      this.state.loading = this.$state.success
      this.events = events
    })

    // refresh timestamps
    this.interval.push(setInterval(() => this.socket.emit('get'), 60000))
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
    eventlistSize: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) this.eventlistSize = old
      else {
        this.settings.widgetEventlistSize = value
        this.update = String(new Date())
      }
    }, 500),
    eventlistShow: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) this.eventlistShow = old
      else {
        this.settings.widgetEventlistShow = value
        this.update = String(new Date())
      }
    }, 500),
    eventlistMessageSize: debounce(function (value, old) {
      if (Number.isNaN(Number(value))) this.eventlistMessageSize = old
      else {
        this.settings.widgetEventlistMessageSize = value
        this.update = String(new Date())
      }
    }, 500),
    update: function () {
      this.socket.emit('settings.update', this.settings)
    }
  },
  methods: {
    cleanup: function () {
      console.log('Cleanup => eventlist')
      this.socket.emit('widget.eventlist.cleanup')
      this.events = []
    },
    prepareMessage: function (event) {
      let t = this.translate(`eventlist-events.${event.event}`)

      // change resub translate if not shared substreak
      if (event.event === 'resub' && !event.subStreakShareEnabled) {
        t = this.translate(`eventlist-events.resubWithoutStreak`);
      }
      t = t.replace('$formatted_amount', '<strong style="font-size: 1rem">' + get(event, 'currency', '$') + parseFloat(get(event, 'amount', '0')).toFixed(2) + '</strong>')
      t = t.replace('$viewers', '<strong style="font-size: 1rem">' + get(event, 'viewers', '0') + '</strong>')
      t = t.replace('$tier', `${this.translate('tier')} <strong style="font-size: 1rem">${get(event, 'tier', 'n/a')}</strong>`)
      t = t.replace('$username', get(event, 'from', 'n/a'))
      t = t.replace('$subCumulativeMonthsName', get(event, 'subCumulativeMonthsName', 'months'))
      t = t.replace('$subCumulativeMonths', '<strong style="font-size: 1rem">' + get(event, 'subCumulativeMonths', '0') + '</strong>')
      t = t.replace('$subStreakName', get(event, 'subStreakName', 'months'))
      t = t.replace('$subStreak', '<strong style="font-size: 1rem">' + get(event, 'subStreak', '0') + '</strong>')
      t = t.replace('$bits', '<strong style="font-size: 1rem">' + get(event, 'bits', '0') + '</strong>')

      let output = `<span style="font-size:0.7rem; font-weight: normal">${t}</span>`
      if (event.song_url && event.song_title) output += `<div style="font-size: 0.7rem"><strong>${this.translate('song-request')}:</strong> <a href="${event.song_url}">${event.song_title}</a></div>`
      if (event.message) output += `<div class="eventlist-blockquote" style="font-size: ${this.eventlistMessageSize}px">${event.message.replace(/(\w{10})/g, '$1<wbr>')}</div>` // will force new line for long texts

      return output
    },
    moment: function (args) {
      return moment(args) // expose moment function
    },
    toggle: function (id) {
      this.settings[id] = !this.settings[id]
      this.update = String(new Date())
    }
  }
}
</script>
