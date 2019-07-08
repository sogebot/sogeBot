<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#eventlist-main" aria-controls="home" role="tab" data-toggle="tab" title="EventList">
          <fa :icon='["far", "calendar"]'></fa>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <span class="dropdown" id="eventlistDropdown">
          <a class="nav-link nav-dropdown" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="cursor: pointer; padding: 10px">
            <fa icon="eye"></fa>
          </a>
          <span id="eventlistDropdownData">
            <div class="dropdown-menu dropdown-force-visible" data-allow-focus aria-labelledby="dropdownMenuButton" style="padding:0; margin: 0;">
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistFollows ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistFollows')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="heart"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistHosts ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistHosts')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="tv"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistRaids ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistRaids')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="random"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistCheers ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistCheers')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="gem"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistSubs ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistSubs')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="star"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistSubgifts ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistSubgifts')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="gift"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistSubcommunitygifts ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistSubcommunitygifts')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="box-open"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistResubs ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistResubs')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="star-half"></fa>
                  <fa icon="long-arrow-alt-right"></fa>
                </font-awesome-layers>
              </button>
              <button
                class="btn nav-btn"
                :class="[ settings.widgetEventlistTips ? 'btn-outline-success' : 'btn-outline-danger' ]"
                @click="toggle('widgetEventlistTips')">
                <font-awesome-layers style="height: 1em; line-height: 0.8em; width: 1em">
                  <fa icon="dollar-sign"></fa>
                </font-awesome-layers>
              </button>
            </div>
          </span>
        </span>
      </li>
      <li role="presentation">
        <a class="nav-link" href="#eventlist-settings" aria-controls="home" role="tab" data-toggle="tab" title="Settings">
          <fa icon="cog"></fa>
        </a>
      </li>
      <li role="presentation" class="nav-item widget-popout" v-if="!popout">
        <a class="nav-link" title="Popout" target="_blank" href="/popout/#eventlist">
          <fa icon="external-link-alt"></fa>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title" >{{commons.translate('eventlist')}}</h6>
      </li>
    </ul>
  </div>
  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="eventlist-main">
        <div class="list-group" v-if="events">
          <div
            v-for="(event, index) of fEvents"
            :key="index"
            class="list-group-item"
            style="border-left: 0; border-right: 0; padding: 0.2rem 1.25rem 0.4rem 1.25rem">
            <i :title="moment(event.timestamp).format('LLLL')" class="eventlist-text">{{moment(event.timestamp).fromNow()}}</i>
            <div class="eventlist-username" :style="{'font-size': eventlistSize + 'px'}">
              <div class="d-flex">
                <div class="w-100">
                  <span :title="event.username" style="z-index: 9">{{event.username}}</span>
                  <span v-html="prepareMessage(event)"></span>
                </div>
                <div style="flex-shrink: 15;">
                  <fa v-if="event.event === 'follow'" icon="heart" :class="[`icon-${event.event}`, 'icon']" />
                  <fa v-if="event.event === 'host'" icon="tv" :class="[`icon-${event.event}`, 'icon']" />
                  <fa v-if="event.event === 'raid'" icon="random" :class="[`icon-${event.event}`, 'icon']" />
                  <fa v-if="event.event === 'sub'" icon="star" :class="[`icon-${event.event}`, 'icon']" />
                  <fa v-if="event.event === 'subgift'" icon="gift" :class="[`icon-${event.event}`, 'icon']" />
                  <fa v-if="event.event === 'subcommunitygift'" icon="box-open" :class="[`icon-${event.event}`, 'icon']" />
                  <font-awesome-layers v-if="event.event === 'resub'" :class="[`icon-${event.event}`, 'icon']">
                    <fa icon="star-half"></fa>
                    <fa icon="long-arrow-alt-right"></fa>
                  </font-awesome-layers>
                  <fa v-if="event.event === 'cheer'" icon="gem" :class="[`icon-${event.event}`, 'icon']" />
                  <fa v-if="event.event === 'tip'" icon="dollar-sign" :class="[`icon-${event.event}`, 'icon']" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="alert alert-primary" role="alert" v-else>
          <fa icon="circle-notch" spin />
          <strong>loading data...</strong>
        </div>
      </div>
      <!-- /MAIN -->

      <div role="tabpanel" class="tab-pane" id="eventlist-settings">
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">{{commons.translate('eventlist-show-number')}}</span>
          </div>
          <input type="text" class="form-control" v-model="eventlistShow">
          <div class="input-group-append">
            <span class="input-group-text">{{commons.translate('eventlist-show')}}</span>
          </div>
        </div>
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">{{commons.translate('followers-size')}}</span>
          </div>
          <input type="text" class="form-control" v-model="eventlistSize">
          <div class="input-group-append">
            <span class="input-group-text">px</span>
          </div>
        </div>
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text">{{commons.translate('followers-message-size')}}</span>
          </div>
          <input type="text" class="form-control" v-model="eventlistMessageSize">
          <div class="input-group-append">
            <span class="input-group-text">px</span>
          </div>
        </div>
        <hold-button class="mt-2 btn btn-danger w-100" icon="eraser" @trigger="cleanup()">
          <template slot="title">Cleanup</template>
          <template slot="onHoldTitle">Hold to cleanup</template>
        </hold-button>
      </div>
      <!-- /SETTINGS -->
    </div>
  </div>
</div>
</template>

<script>
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
export default {
  props: ['commons', 'popout'],
  components: {
    'font-awesome-layers': FontAwesomeLayers,
    holdButton: () => import('../../components/holdButton.vue'),
  },
  data: function () {
    return {
      socket: io('/widgets/eventlist', { query: "token=" + this.token }),
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
      update: String(new Date()),
      events: null,
      eventlistShow: 0,
      eventlistSize: 0,
      eventlistMessageSize: 0
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
    this.socket.emit('settings', (e, data) => {
      this.settings = {
        widgetEventlistFollows: _.isNil(data.widgetEventlistFollows) ? true : data.widgetEventlistFollows,
        widgetEventlistHosts: _.isNil(data.widgetEventlistHosts) ? true : data.widgetEventlistHosts,
        widgetEventlistRaids: _.isNil(data.widgetEventlistRaids) ? true : data.widgetEventlistRaids,
        widgetEventlistCheers: _.isNil(data.widgetEventlistCheers) ? true : data.widgetEventlistCheers,
        widgetEventlistSubs: _.isNil(data.widgetEventlistSubs) ? true : data.widgetEventlistSubs,
        widgetEventlistSubgifts: _.isNil(data.widgetEventlistSubgifts) ? true : data.widgetEventlistSubgifts,
        widgetEventlistSubcommunitygifts: _.isNil(data.widgetEventlistSubcommunitygifts) ? true : data.widgetEventlistSubcommunitygifts,
        widgetEventlistResubs: _.isNil(data.widgetEventlistResubs) ? true : data.widgetEventlistResubs,
        widgetEventlistTips: _.isNil(data.widgetEventlistTips) ? true : data.widgetEventlistTips
      }

      this.eventlistShow = data.widgetEventlistShow
      this.eventlistSize = data.widgetEventlistSize,
      this.eventlistMessageSize = data.widgetEventlistMessageSize
      console.group('Eventlist widgets settings')
      console.debug(this.settings)
      console.groupEnd()
    })
    this.socket.emit('get') // get initial widget state
    this.socket.on('update', events => this.events = events)

    // refresh timestamps
    setInterval(() => this.socket.emit('get'), 60000)
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
      return _.chunk(this.events.filter(o => toShow.includes(o.event)), this.eventlistShow)[0]
    }
  },
  watch: {
    eventlistSize: _.debounce(function (value, old) {
      if (_.isNaN(Number(value))) this.eventlistSize = old
      else {
        this.settings.widgetEventlistSize = value
        this.update = String(new Date())
      }
    }, 500),
    eventlistShow: _.debounce(function (value, old) {
      if (_.isNaN(Number(value))) this.eventlistShow = old
      else {
        this.settings.widgetEventlistShow = value
        this.update = String(new Date())
      }
    }, 500),
    eventlistMessageSize: _.debounce(function (value, old) {
      if (_.isNaN(Number(value))) this.eventlistMessageSize = old
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
      let t = commons.translate(`eventlist-events.${event.event}`)

      // change resub translate if not shared substreak
      if (event.event === 'resub' && !event.subStreakShareEnabled) {
        t = commons.translate(`eventlist-events.resubWithoutStreak`);
      }
      t = t.replace('$formatted_amount', '<strong style="font-size: 1rem">' + _.get(event, 'currency', '$') + parseFloat(_.get(event, 'amount', '0')).toFixed(2) + '</strong>')
      t = t.replace('$viewers', '<strong style="font-size: 1rem">' + _.get(event, 'viewers', '0') + '</strong>')
      t = t.replace('$tier', `${commons.translate('tier')} <strong style="font-size: 1rem">${_.get(event, 'tier', 'n/a')}</strong>`)
      t = t.replace('$username', _.get(event, 'from', 'n/a'))
      t = t.replace('$subCumulativeMonthsName', _.get(event, 'subCumulativeMonthsName', 'months'))
      t = t.replace('$subCumulativeMonths', '<strong style="font-size: 1rem">' + _.get(event, 'subCumulativeMonths', '0') + '</strong>')
      t = t.replace('$subStreakName', _.get(event, 'subStreakName', 'months'))
      t = t.replace('$subStreak', '<strong style="font-size: 1rem">' + _.get(event, 'subStreak', '0') + '</strong>')
      t = t.replace('$bits', '<strong style="font-size: 1rem">' + _.get(event, 'bits', '0') + '</strong>')

      let output = `<span style="font-size:0.7rem; font-weight: normal">${t}</span>`
      if (event.song_url && event.song_title) output += `<div style="font-size: 0.7rem"><strong>${commons.translate('song-request')}:</strong> <a href="${event.song_url}">${event.song_title}</a></div>`
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
