<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="active nav-link" href="#queue-users" aria-controls="home" role="tab" data-toggle="tab" title="Queue">
          <fa icon="users"/>
          {{ fUsers.length }}
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#queue-main" aria-controls="home" role="tab" data-toggle="tab" title="Queue">
          <fa icon="hand-pointer"></fa>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <button
          class="btn nav-btn"
          :class="[ eligibility.all ? 'btn-outline-success' : 'btn-outline-danger' ]"
          @click="toggle('all')">
          <fa icon="users" />
        </button>
      </li>
      <li role="presentation" class="nav-item">
        <button
          class="btn nav-btn"
          :class="[ eligibility.followers ? 'btn-outline-success' : 'btn-outline-danger' ]"
          @click="toggle('followers')">
          <fa icon="heart" />
        </button>
      </li>
      <li role="presentation" class="nav-item">
        <button
          class="btn nav-btn"
          :class="[ eligibility.subscribers ? 'btn-outline-success' : 'btn-outline-danger' ]"
          @click="toggle('subscribers')">
          <fa icon="star" />
        </button>
      </li>
      <li role="presentation" class="nav-item widget-popout" v-if="!popout">
        <a class="nav-link" title="Popout" target="_blank" href="/popout/#queue">
          <fa icon="external-link-alt"></fa>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{commons.translate('widget-title-queue')}}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="queue-users">
        <div class="text-center pb-1">
          <button class="btn btn-sm" :class="[locked ? 'btn-danger' : 'btn-success']" @click="locked = !locked">
            <fa v-if="locked" icon="lock" fixed-width></fa>
            <fa v-else icon="lock-open" fixed-width></fa>
          </button>
          <template v-if="!multiSelection">
            <div style="display: inline-block; width: fit-content; position: relative; top: 1px;">
              <div class="input-group input-group-sm">
                <input class="form-control" style="width: 60px" v-model="selectCount" />
                <div class="input-group-append">
                  <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-primary" title="Pick" @click="pick(null)">
                      <fa icon="hand-pointer"></fa>
                    </button>
                    <button @click="random = !random" :class="[random ? 'btn-success' : 'btn-danger']" class="btn btn-sm" title="Toggle random">
                      <fa icon="random"></fa>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <button v-if="multiSelection" class="btn btn-sm btn-primary" @click="pick(selectedUsers)">Pick {{ selectedUsers.length }}</button>
          <button @click="multiSelection = !multiSelection; selectedUsers = []" :class="[multiSelection ? 'btn-success' : 'btn-danger']" class="btn btn-sm">Toggle selection</button>
          <span style="position:relative; top: 3px">
            <fa icon="eye-slash"></fa>
            {{ users.length - fUsers.length }}
          </span>
          <button class="btn btn-sm btn-danger" @click="clear">Clear</button>
        </div>
        <ul class="list-group">
          <li
            v-for="user of fUsers"
            :key="user.username"
            class="list-group-item border-left-0 border-right-0">
            <strong style="font-size: 1.3rem">{{ user.username }}</strong>
            <small>{{ new Date(user.created_at).toLocaleString() }}</small>
            <div>
              <code v-if="user.is.follower"> FOLLOWER </code>
              <code v-if="user.is.subscriber"> SUBSCRIBER </code>
            </div>
            <button v-if="!multiSelection" class="btn btn-primary" style="position: absolute; top: 25%; right: 2%;" @click="pick(user.username)">Pick {{user.username}}</button>
            <button v-else @click="select(user.username)" :class="[selectedUsers.includes(user.username) ? 'btn-success' : 'btn-danger']" class="btn" style="position: absolute; top: 25%; right: 2%;">
              <fa icon="check" fixed-width v-if="selectedUsers.includes(user.username)"></fa>
              <fa icon="times" fixed-width v-else></fa>
            </button>
          </li>
        </ul>
      </div>
      <div role="tabpanel" class="tab-pane" id="queue-main">
        <ul class="list-group">
          <li
            v-for="user of picked"
            :key="user.username"
            class="list-group-item border-left-0 border-right-0">
            <strong style="font-size: 1.3rem">{{ user.username }}</strong>
            <div>
              <code v-if="user.is.follower"> FOLLOWER </code>
              <code v-if="user.is.subscriber"> SUBSCRIBER </code>
            </div>
          </li>
        </ul>
      </div> <!-- /MAIN -->

      <div class="clearfix"></div>
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['token', 'commons', 'popout'],
  mounted: function () {
    this.$emit('mounted')
  },
  created: function () {
    setInterval(() => this.socket.emit('find', { collection: 'picked' }, (err, users) => {
      this.picked = users
    }), 1000)
    setInterval(() => this.socket.emit('find', {}, (err, users) => {
      this.users = users
    }), 1000)
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
    updated: _.debounce(function () {
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
      users: [],
      picked: [],
      updated: String(new Date()),
      socket: io('/systems/queue', {query: "token=" + this.token})
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
        $('a[href="#queue-main"]').tab('show')
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
