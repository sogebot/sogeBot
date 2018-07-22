<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="active nav-link" href="#queue-users" aria-controls="home" role="tab" data-toggle="tab" title="Queue">
          <font-awesome-icon icon="users"/>
          {{ fUsers.length }}
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#queue-main" aria-controls="home" role="tab" data-toggle="tab" title="Queue">
          <font-awesome-icon icon="hand-pointer"></font-awesome-icon>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <button
          class="btn nav-btn"
          :class="[ eligibility.all ? 'btn-outline-success' : 'btn-outline-danger' ]"
          @click="toggle('all')">
          <font-awesome-icon icon="users" />
        </button>
      </li>
      <li role="presentation" class="nav-item">
        <button
          class="btn nav-btn"
          :class="[ eligibility.followers ? 'btn-outline-success' : 'btn-outline-danger' ]"
          @click="toggle('followers')">
          <font-awesome-icon icon="heart" />
        </button>
      </li>
      <li role="presentation" class="nav-item">
        <button
          class="btn nav-btn"
          :class="[ eligibility.subscribers ? 'btn-outline-success' : 'btn-outline-danger' ]"
          @click="toggle('subscribers')">
          <font-awesome-icon icon="star" />
        </button>
      </li>
      <li role="presentation" class="nav-item widget-popout" v-if="!popout">
        <a class="nav-link" title="Popout" target="_blank" href="/popout/#queue">
          <font-awesome-icon icon="external-link-alt"></font-awesome-icon>
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
            <font-awesome-icon v-if="locked" icon="lock" fixed-width></font-awesome-icon>
            <font-awesome-icon v-else icon="lock-open" fixed-width></font-awesome-icon>
          </button>
          <template v-if="!multiSelection">
            <div style="display: inline-block; width: fit-content; position: relative; top: 1px;">
              <div class="input-group input-group-sm">
                <input class="form-control" style="width: 60px" v-model="selectCount" />
                <div class="input-group-append">
                  <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-primary" title="Pick">
                      <font-awesome-icon icon="hand-pointer"></font-awesome-icon>
                    </button>
                    <button @click="random = !random" :class="[random ? 'btn-success' : 'btn-danger']" class="btn btn-sm" title="Toggle random">
                      <font-awesome-icon icon="random"></font-awesome-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <button v-if="multiSelection" class="btn btn-sm btn-primary">Pick {{ selectedUsers.length }}</button>
          <button @click="multiSelection = !multiSelection; selectedUsers = []" :class="[multiSelection ? 'btn-success' : 'btn-danger']" class="btn btn-sm">Toggle selection</button>
          <span style="position:relative; top: 3px">
            <font-awesome-icon :icon="['far', 'eye-slash']"></font-awesome-icon>
            {{ users.length - fUsers.length }}
          </span>
          <button class="btn btn-sm btn-danger">Clear</button>
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
            <button v-if="!multiSelection" class="btn btn-primary" style="position: absolute; top: 25%; right: 2%;">Pick {{user.username}}</button>
            <button v-else @click="select(user.username)" :class="[selectedUsers.includes(user.username) ? 'btn-success' : 'btn-danger']" class="btn" style="position: absolute; top: 25%; right: 2%;">
              <font-awesome-icon icon="check" fixed-width v-if="selectedUsers.includes(user.username)"></font-awesome-icon>
              <font-awesome-icon icon="times" fixed-width v-else></font-awesome-icon>
            </button>
          </li>
        </ul>
      </div>
      <div role="tabpanel" class="tab-pane" id="queue-main">
      </div> <!-- /MAIN -->

      <div class="clearfix"></div>
    </div>
  </div>
</div>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faLock, faUsers, faUser, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom } from '@fortawesome/free-solid-svg-icons';
import { faEyeSlash } from '@fortawesome/free-regular-svg-icons';

library.add(faLock, faUsers, faUser, faEyeSlash, faCheck, faTimes, faHeart, faStar, faLockOpen, faHandPointer, faRandom)

export default {
  props: ['token', 'commons'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  mounted: function () {
    this.$emit('mounted')
  },
  created: function () {
    setInterval(() => this.socket.emit('find', {}, (err, users) => {
      this.users = users
    }), 1000)
    this.socket.emit('settings', (err, data) => {
      this.eligibility.all = data.eligibility.all
      this.eligibility.followers = data.eligibility.followers
      this.eligibility.subscribers = data.eligibility.subscribers

      this.locked = data._.locked
    })
  },
  watch: {
    locked: function () {
      this.updated = String(new Date())
    },
    updated: _.debounce(function () {
      const data = {
        eligibility: this.eligibility,
        _: {
          locked: this.locked
        }
      }
      this.socket.emit('settings.update', data, () => {})
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
        return users
      }
    }
  },
  data: function () {
    return {
      eligibility: {
        all: true,
        followers: true,
        subscribers: true
      },
      selectedUsers: [],
      locked: true,
      multiSelection: false,
      random: false,
      selectCount: 1,
      users: [],
      updated: String(new Date()),
      socket: io('/system/queue', {query: "token=" + this.token})
    }
  },
  methods: {
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
