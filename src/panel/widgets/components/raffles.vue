<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-raffles')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item(target="_blank" href="/popout/#raffles")
                  | Popout
                b-dropdown-divider
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'raffles'))").text-danger
                    | Remove <strong>{{translate('widget-title-raffles')}}</strong> widget
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-raffles') }}

        b-tab(active)
          template(v-slot:title)
            small {{ participants.length }}
            fa(icon="users" fixed-width).ml-1
          b-card-text
            div.input-group
              input(type="text" class="form-control" :placeholder="translate('placeholder-search')" v-model="search")
              span.input-group-btn
                button(class="btn btn-danger" type="button" title="Cancel search" @click="search = ''")
                  fa(icon="trash")
            ul.list-unstyled.p-2
              li(v-for="participant of fParticipants" :key="participant._id" style="cursor: pointer" @click="toggleEligibility(participant)")
                fa(
                  :class="[participant.eligible ? 'text-success': '']"
                  :icon="['far', participant.eligible ? 'check-circle' : 'circle']"
                ).mr-1
                | {{ participant.username }}
              li.text-danger
                fa(icon="eye-slash").mr-1
                | {{Math.abs(fParticipants.length - participants.length)}} {{translate('hidden')}}

        b-tab
          template(v-slot:title)
            fa(icon="gift" fixed-width)
          b-card-text
            div.input-group
              span.input-group-btn.btn-group
                button(class="btn btn-success" type="button"
                  :disabled="keyword.trim().length <= 1 || running"
                  @click="open()"
                )
                  fa(icon="plus" fixed-width)
                button(class="btn btn-danger" type="button"
                  :disabled="!running"
                  @click="close()"
                  )
                    fa(icon="trash" fixed-width)
              div.input-group-prepend
                span.input-group-text !
              input(type="text" class="form-control" :placeholder="translate('placeholder-enter-keyword')" v-model="keyword" :disabled="running")
              span.input-group-btn.btn-group
                button(type="button" class="btn btn-success" :disabled="!running" @click="socket.emit('pick')")
                  fa(icon="trophy" fixed-width)

            div.row.pb-1
              b-col
              div.w-100
              b-col.text-center
                div.d-flex
                  button(type="button" class="btn btn-default btn-label w-100 text-left" disabled="disabled") {{translate('eligible-to-enter')}}
                  button(
                    class="btn d-block border-0 w-100" style="flex-shrink: 2;"
                    :class="[ eligibility.all ? 'btn-outline-success' : 'btn-outline-danger' ]"
                    @click="toggle('all')"
                    :title="translate('everyone')"
                    :disabled="running"
                  )
                    fa(icon="users")

                  button(
                    class="btn d-block border-0 w-100" style="flex-shrink: 2;"
                    :class="[ eligibility.followers ? 'btn-outline-success' : 'btn-outline-danger' ]"
                    @click="toggle('followers')"
                    :title="translate('followers')"
                    :disabled="running"
                  )
                    fa(icon="heart" fixed-width)

                  button(
                    class="btn d-block border-0 w-100" style="flex-shrink: 2;"
                    :class="[ eligibility.subscribers ? 'btn-outline-success' : 'btn-outline-danger' ]"
                    @click="toggle('subscribers')"
                    :title="translate('subscribers')"
                    :disabled="running"
                  )
                    fa(icon="star" fixed-width)

            div.row.pb-1
              b-col
                div.d-flex
                  button(type="button" class="btn btn-default btn-label w-100 text-left" disabled="disabled") {{translate('raffle-type')}}
                  button(class="btn d-block w-100"
                    :class="[isTypeKeywords ? 'btn-primary' : 'btn-outline-primary border-0']"
                    @click="isTypeKeywords = true"
                    :disabled="running"
                  )
                    | {{translate('raffle-type-keywords')}}

                  button(class="btn d-block w-100"
                    :class="[isTypeKeywords ? 'btn-outline-primary border-0' : 'btn-primary']"
                    @click="isTypeKeywords = false"
                    :disabled="running"
                  )
                    | {{translate('raffle-type-tickets')}}

            div(class="row" v-if="!isTypeKeywords")
              b-col
                div.d-flex
                  button(type="button" class="btn btn-default btn-label w-50 text-left" disabled) {{translate('raffle-tickets-range')}}
                  div.w-100
                    div.input-group
                      div.input-group-prepend
                        span.input-group-text min
                      input(type="number" v-model="ticketsMin" class="form-control" placeholder="0" id="minTickets" min="0" :disabled="running")
                    div.input-group
                      div.input-group-prepend
                        span.input-group-text max
                      input(type="number" v-model="ticketsMax" class="form-control" placeholder="100" id="maxTickets" min="0" :disabled="running")

        b-tab(v-if="winner")
          template(v-slot:title)
            fa(icon="trophy" fixed-width).mr-1
            | {{ winner.username }}
          b-card-text
            template(v-if="winner")
              div(style="text-align: center")
                strong(style="font-size: 30px")
                  fa(:icon="['fab', 'twitch']").mr-1
                  | {{winner.username}}

              div(style="text-align: center")
                div.d-flex
                  div(class="w-100 btn" style="cursor: initial" :class="[winner.is.follower ? 'text-success' : 'text-danger']") {{translate('follower')}}
                  div(class="w-100 btn" style="cursor: initial" :class="[winner.is.subscriber ? 'text-success' : 'text-danger']") {{translate('subscriber')}}
                  button(type="button" class="btn btn-outline-secondary border-0 btn-block" @click="socket.emit('pick')")
                    fa(icon="sync").mr-1
                    | {{translate('roll-again')}}

              div(class="table-responsive" style="margin-top: 0; padding-left: 10px; padding-right: 10px;")
                table.table.table-sm
                  thead
                    tr
                      td(colspan="2" style="vertical-align: bottom; font-size: 18px;")
                        fa(icon="comments").mr-1
                        | {{translate('messages')}}
                  tbody(style="font-size:10px;")
                    tr(v-for="(message, index) of winnerMessages" :key="index")
                      td {{message.text}}
                      td.text-right
                        small.text-muted {{ new Date(message.timestamp).toLocaleTimeString()}}

        b-tab
          template(v-slot:title)
            fa(icon="cog" fixed-width)
          b-card-text
            div.input-group
              div.input-group-prepend
                span.input-group-text {{translate('announce-every')}}
              input(type="number" class="form-control" v-model.number="raffleAnnounceInterval")
              div.input-group-append
                span.input-group-text {{translate('minutes')}}

            div.input-group.mt-2
              div.input-group-prepend
                span.input-group-text {{translate('systems.raffles.widget.subscribers-luck')}}
              input(type="number" class="form-control" v-model.number="luck.subscribersPercent")
              div.input-group-append
                span.input-group-text %

            div.input-group.mt-2
              div.input-group-prepend
                span.input-group-text {{translate('systems.raffles.widget.followers-luck')}}
              input(type="number" class="form-control" v-model.number="luck.followersPercent")
              div.input-group-append
                span.input-group-text %
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { EventBus } from 'src/panel/helpers/event-bus';
import { orderBy } from 'lodash-es';
export default {
  props: ['popout', 'nodrag'],
  data: function () {
    return {
      EventBus,
      orderBy: orderBy,
      raffleAnnounceInterval: 0,
      luck: {
        subscribersPercent: 0,
        followersPercent: 0
      },

      search: '',

      eligibility: {
        all: true,
        followers: false,
        subscribers: false
      },

      isTypeKeywords: true,
      keyword: '',
      running: false,
      ticketsMax: 100,
      ticketsMin: 0,
      winner: null,
      participants: [],

      socket: getSocket('/systems/raffles'),
      updated: String(new Date())
    }
  },
  computed: {
    fParticipants: function () {
      if (this.search.trim().length === 0) return this.participants
      else {
        return this.participants.filter(o => o.username.includes(this.search.trim()))
      }
    },
    winnerMessages: function () {
      if (this.winner) {
        return this.participants.filter(o => o.username === this.winner.username)[0].messages
      } else return []
    }
  },
  created: function () {
    this.socket.emit('settings', (err, data) => {
      console.log({data})
      this.raffleAnnounceInterval = data.raffleAnnounceInterval
      this.luck.subscribersPercent = data.luck.subscribersPercent
      this.luck.followersPercent = data.luck.followersPercent
    })

    if (localStorage.getItem('/widget/raffles/eligibility/all')) this.eligibility.all = JSON.parse(localStorage.getItem('/widget/raffles/eligibility/all'))
    if (localStorage.getItem('/widget/raffles/eligibility/followers')) this.eligibility.followers = JSON.parse(localStorage.getItem('/widget/raffles/eligibility/followers'))
    if (localStorage.getItem('/widget/raffles/eligibility/subscribers')) this.eligibility.subscribers = JSON.parse(localStorage.getItem('/widget/raffles/eligibility/subscribers'))

    this.refresh()
  },
  watch: {
    raffleAnnounceInterval: function (val) {
      this.socket.emit('settings.update', { raffleAnnounceInterval: val }, () => {})
    },
    'luck.followersPercent': function () {
      this.socket.emit('settings.update', { luck: this.luck }, () => {})
    },
    'luck.subscribersPercent': function () {
      this.socket.emit('settings.update', { luck: this.luck }, () => {})
    },
    ticketsMin: function () { this.ticketsMin = Number(this.ticketsMin) },
    ticketsMax: function () { this.ticketsMax = Number(this.ticketsMax) },
    keyword: function () {
      if (!this.keyword.startsWith('!')) this.keyword = '!' + this.keyword
    }
  },
  methods: {
    refresh: async function () {
      await Promise.all([
        new Promise((resolve) => {
          this.socket.emit('find', {}, (err, raffles) => {
            const raffle = orderBy(raffles, 'timestamp', 'desc')[0]
            if (Object.keys(raffle || {}).length > 0) {
              this.running = !raffle.winner
              if (!raffle.winner) {
                this.keyword = raffle.keyword
                this.isTypeKeywords = raffle.type === 0
                this.ticketsMax = raffle.max
                this.ticketsMin = raffle.min
                this.winner = null

                // set eligibility
                if (!raffle.subscribers && !raffle.followers) {
                  this.eligibility.all = false
                  this.toggle('all') // enable all
                } else {
                  this.eligibility.followers = !raffle.followers
                  this.eligibility.subscribers = !raffle.subscribers
                  this.toggle('followers')
                  this.toggle('subscribers')
                }
              } else {
                if (this.winner === null) {
                  this.socket.emit('findOne', { collection: '_users', where: {username: raffle.winner}}, (err, user) => this.winner = user)
                }
              }
            }
            resolve()
          })
        }),
        new Promise((resolve) => {
          this.socket.emit('find', { collection: 'participants' }, (err, data) => {
            this.participants = data
            resolve()
          })
        })
      ])

      setTimeout(() => this.refresh(), 1000)
    },
    toggleEligibility: function (participant) {
      this.socket.emit('update', { collection: 'participants', items: [{_id: String(participant._id), eligible: !participant.eligible}] })
      participant.eligible = !participant.eligible
    },
    toggle: function (pick) {
      Vue.set(this.eligibility, pick, !this.eligibility[pick])
      if (pick === 'all' && this.eligibility[pick]) {
        this.eligibility.followers = false
        this.eligibility.subscribers = false
      }
      if (!this.eligibility.all && !this.eligibility.followers && !this.eligibility.subscribers) this.eligibility.all = true
      if (this.eligibility.followers || this.eligibility.subscribers) this.eligibility.all = false
      this.updated = String(new Date())

      localStorage.setItem('/widget/raffles/eligibility/all', JSON.stringify(this.eligibility.all))
      localStorage.setItem('/widget/raffles/eligibility/followers', JSON.stringify(this.eligibility.followers))
      localStorage.setItem('/widget/raffles/eligibility/subscribers', JSON.stringify(this.eligibility.subscribers))
    },
    open: function () {
      let out = []
      out.push(this.keyword)
      if (this.eligibility.followers || this.eligibility.subscribers) out.push('-for ' + (this.eligibility.followers ? 'followers' : ' ') + (this.eligibility.subscribers ? 'subscribers' : ' '))

      if (!this.isTypeKeywords) {
        out.push(`-min ${this.ticketsMin}`)
        out.push(`-max ${this.ticketsMax}`)
      }
      console.group('raffles open()')
      console.debug('out: ', out.join(' '))
      console.groupEnd()
      this.socket.emit('open', out.join(' '))
    },
    close: function () {
      this.socket.emit('close')
      this.running = false
    }
  }
}
</script>
