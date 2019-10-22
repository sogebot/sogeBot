<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden" v-model="tabIndex").h-100
        template(v-slot:tabs-start v-if="!popout")
          li.nav-item.px-2.grip.text-secondary.align-self-center
            fa(icon="grip-vertical" fixed-width)
          li.nav-item
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-eventlist')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-group(header="Eligibility")
                b-dropdown-form
                  b-button(@click="toggle('all')" :variant="eligibility.all ? 'success' : 'danger'")
                    | ALL
                  b-button(@click="toggle('followers')" :variant="eligibility.followers ? 'success' : 'danger'")
                    | FOLLOWERS
                  b-button(@click="toggle('subscribers')" :variant="eligibility.subscribers ? 'success' : 'danger'")
                    | SUBSCRIBERS
              b-dropdown-divider
              b-dropdown-item(href="/popout/#eventlist")
                | Popout
              b-dropdown-divider
              b-dropdown-item
                a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'eventlist'))").text-danger
                  | Remove <strong>{{translate('widget-title-eventlist')}}</strong> widget

        b-tab
          template(v-slot:title)
            fa(icon='hand-pointer' fixed-width)
          b-card-text
            ul.list-group
              li(
                v-for="user of picked"
                :key="user.username"
                class="list-group-item border-left-0 border-right-0"
              )
                strong(style="font-size: 1.3rem") {{ user.username }}
                div
                  code(v-if="user.is.follower") FOLLOWER
                  code(v-if="user.is.subscriber") SUBSCRIBER

        b-tab
          template(v-slot:title)
            fa(icon='users' fixed-width)
            | {{ fUsers.length }}
          b-card-text
            b-input-group
              template(v-slot:append)
                button(@click="locked = !locked" :class="[locked ? 'btn-danger' : 'btn-success']").btn
                  fa(v-if="locked" icon="lock" fixed-width)
                  fa(v-else icon="lock-open" fixed-width)
                template(v-if="!multiSelection")
                  div(class="btn-group" role="group")
                    button(class="btn btn-sm btn-primary" title="Pick" @click="pick(null)")
                      fa(icon="hand-pointer")
                    button(@click="random = !random" :class="[random ? 'btn-success' : 'btn-danger']" class="btn btn-sm" title="Toggle random")
                      fa(icon="random")

              template(v-if="!multiSelection")
                b-form-input(style="width: 60px" v-model="selectCount")
                    div.input-group-append
                      div(class="btn-group" role="group")
                        button(class="btn btn-sm btn-primary" title="Pick" @click="pick(null)")
                          fa(icon="hand-pointer")
                        button(@click="random = !random" :class="[random ? 'btn-success' : 'btn-danger']" class="btn btn-sm" title="Toggle random")
                          fa(icon="random")

              template(v-slot:prepend)
                button(v-if="multiSelection" class="btn btn-sm btn-primary" @click="pick(selectedUsers)") Pick {{ selectedUsers.length }}
                button(@click="multiSelection = !multiSelection; selectedUsers = []" :class="[multiSelection ? 'btn-success' : 'btn-danger']" class="btn btn-sm") Toggle selection
                span(style="position:relative; top: 6px")
                  fa(icon="eye-slash")
                  | {{ users.length - fUsers.length }}
                button(class="btn btn-sm btn-danger" @click="clear") Clear

            ul.list-group
              li(
                v-for="user of fUsers"
                :key="user.username"
                class="list-group-item border-left-0 border-right-0"
              )
                strong(style="font-size: 1.3rem") {{ user.username }}
                small {{ new Date(user.created_at).toLocaleString() }}
                div
                  code(v-if="user.is.follower") FOLLOWER
                  code(v-if="user.is.subscriber") SUBSCRIBER
                button(v-if="!multiSelection" class="btn btn-primary" style="position: absolute; top: 25%; right: 2%;" @click="pick(user.username)") Pick {{user.username}}
                button(v-else @click="select(user.username)" :class="[selectedUsers.includes(user.username) ? 'btn-success' : 'btn-danger']" class="btn" style="position: absolute; top: 25%; right: 2%;")
                  fa(icon="check" fixed-width v-if="selectedUsers.includes(user.username)")
                  fa(icon="times" fixed-width v-else)
</template>

<script>
import { getSocket } from 'src/panel/helpers/socket';
import { EventBus } from 'src/panel/helpers/event-bus';
import { debounce } from 'lodash-es';
export default {
  props: ['popout'],
  beforeDestroy: function() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  },
  created: function () {
    this.interval.push(
      setInterval(() => this.socket.emit('find', { collection: 'picked' }, (err, users) => {
        this.picked = users
      }), 1000)
    );
    this.interval.push(
      setInterval(() => this.socket.emit('find', {}, (err, users) => {
        this.users = users
      }), 1000)
    )
    this.socket.emit('settings', (err, data) => {
      this.eligibility.eligibilityAll = data.eligibility.eligibilityAll
      this.eligibility.eligibilityFollowers = data.eligibility.eligibilityFollowers
      this.eligibility.eligibilitySubscribers = data.eligibility.eligibilitySubscribers
    })
    this.socket.emit('get.value', 'locked', (err, locked) => {
      this.locked = locked
    })
  },
  watch: {
    locked: function () {
      this.updated = String(new Date())
    },
    updated: debounce(function () {
      const data = {
        eligibility: this.eligibility,
      }
      this.socket.emit('settings.update', data, () => {})
      this.socket.emit('set.value', 'locked', this.locked)
    }, 500)
  },
  computed: {
    fUsers: function () {
      if (this.eligibility.all) return this.users
      else {
        let users = this.users
        if (this.eligibility.followers && this.eligibility.subscribers) users = users.filter(o => o.is.follower || o.is.subscriber)
        else if (this.eligibility.followers) users = users.filter(o => o.is.follower)
        else if (this.eligibility.subscribers) users = users.filter(o => o.is.subscriber)
        return users.sort(o => -(new Date(o.created_at).getTime()))
      }
    }
  },
  data: function () {
    return {
      eligibility: {
        eligibilityAll: true,
        eligibilityFollowers: false,
        eligibilitySubscribers: false
      },
      selectedUsers: [],
      locked: true,
      multiSelection: false,
      random: false,
      selectCount: 1,
      tabIndex: 1,
      users: [],
      picked: [],
      updated: String(new Date()),
      socket: getSocket('/systems/queue'),
      interval: [],
    }
  },
  methods: {
    clear: function () {
      this.socket.emit('delete', { where: {}})
    },
    pick: function (username) {
      const data = {
        random: this.random,
        count: this.selectCount,
        username
      }
      this.socket.emit('pick', data, users => {
        this.tabIndex = 0
        this.picked = users
        this.multiSelection = false
        this.selectedUsers = []
      })
    },
    toggle: function (pick) {
      Vue.set(this.eligibility, pick, !this.eligibility[pick])
      if (!this.eligibility.all && !this.eligibility.followers && !this.eligibility.subscribers) this.eligibility.all = true
      this.updated = String(new Date())
    },
    select: function (username) {
      if (this.selectedUsers.includes(username)) this.selectedUsers = this.selectedUsers.filter(o => o != username)
      else this.selectedUsers.push(username)
    }
  }
}
</script>
