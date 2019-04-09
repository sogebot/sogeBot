<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.goals') }}
        </span>
      </div>
    </div>

    <panel cards search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/registry/goals/edit">{{translate('registry.goals.addGoalGroup')}}</button-with-icon>
      </template>
    </panel>

    <div class="card-deck" v-for="(chunk, index) of _.chunk(_.orderBy(groupsFiltered, 'createdAt', 'desc'), itemsPerPage)" :key="index">
      <div class="card mb-2 p-0" :class="['col-' + (12 / itemsPerPage)]" v-for="group of chunk" :key="group.uid">
        <div class="card-header">
          <strong>{{group.name}}</strong> <small class="text-muted">{{group.uid}}</small>
        </div>
        <div class="card-body">
          <dl class="row">
            <dt class="col-6">{{translate('registry.goals.input.displayAs.title')}}</dt>
            <dd class="col-6">{{group.display.type}}</dd>
            <template v-if="group.display.type === 'fade'">
              <dt class="col-6">{{translate('registry.goals.input.durationMs.title')}}</dt>
              <dd class="col-6">{{group.display.durationMs}}ms</dd>
              <dt class="col-6">{{translate('registry.goals.input.animationInMs.title')}}</dt>
              <dd class="col-6">{{group.display.animationInMs}}ms</dd>
              <dt class="col-6">{{translate('registry.goals.input.animationOutMs.title')}}</dt>
              <dd class="col-6">{{group.display.animationOutMs}}ms</dd>
            </template>
          </dl>
          <ul class="list-group list-group-flush border-top-0">
            <li v-for="goal of _.filter(goals, (o) => o.groupId === group.uid)" :key="goal.uid" class="list-group-item">
              <dl class="row">
                <h5 class="col-12">{{goal.name}}</h5>
                <dt class="col-6">{{translate('registry.goals.input.type.title')}}</dt>
                <dd class="col-6">{{goal.type}}</dd>

                <dt class="col-6" v-if="goal.type === 'tips'">{{translate('registry.goals.input.countBitsAsTips.title')}}</dt>
                <dd class="col-6" v-if="goal.type === 'tips'">{{!!goal.countBitsAsTips}}</dd>

                <dt class="col-6">{{translate('registry.goals.input.goalAmount.title')}}</dt>
                <dd class="col-6">{{goal.goalAmount}}</dd>

                <dt class="col-6">{{translate('registry.goals.input.endAfter.title')}}</dt>
                <dd class="col-6">
                  <fa icon="infinity" fixed-width v-if="goal.endAfterIgnore"></fa>
                  <template v-else>{{goal.endAfter}}</template>
                </dd>
              </dl>
            </li>
          </ul>
        </div>
        <div class="card-footer text-right">
          <hold-button class="btn-danger btn-only-icon" @trigger="removeGoal(group.uid)" icon="trash">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
          <button-with-icon
            :text="'/overlays/goals/' + group.uid"
            :href="'/overlays/goals/' + group.uid"
            class="btn-dark btn-only-icon"
            icon="link"
            target="_blank"
            />
          <button-with-icon
            :text="translate('dialog.buttons.edit')"
            :href="'#/registry/goals/edit/' + group.uid"
            class="btn-primary btn-only-icon"
            icon="edit"
            />
        </div>
      </div>

      <!-- add empty cards -->
      <template v-if="chunk.length !== itemsPerPage">
        <div class="card col-4" style="visibility: hidden" v-for="i in itemsPerPage - (chunk.length % itemsPerPage)" v-bind:key="i"></div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import io from 'socket.io-client';

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      holdButton: () => import('../../components/holdButton.vue'),
      'button-with-icon': () => import('../../components/button.vue'),
    },
    data: function () {
      const object: {
        groups: Goals.Group[],
        goals: Goals.Goal[],
        socket: any,
        search: string,
        currentTime: any,
        domWidth: number,
        interval: number,
        isMounted: boolean,
      } = {
        socket: io('/overlays/goals', { query: "token=" + this.token }),
        search: '',
        groups: [],
        goals: [],
        currentTime: 0,
        domWidth: 0,
        interval: 0,
        isMounted: false,
      }
      return object
    },
    computed: {
      groupsFiltered: function (): Goals.Group[] {
        return this.groups.filter((o: Goals.Group) => {
          return o.name.includes(this.search)
        })
      },
      itemsPerPage: function () {
        if(!this.isMounted) return 3
        else {
          if (this.domWidth > 1400) return 3
          else if (this.domWidth > 850) return 2
          else return 1
        }
      },
    },
    mounted: function() {
      this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
      this.currentTime = Date.now()
      this.isMounted = true
      this.interval = window.setInterval(() => {
        this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
        this.currentTime = Date.now()
      }, 1000)

      this.socket.emit('find', { collection: 'groups' }, (err: Error, groups: Goals.Group[]) => {
        this.groups = groups
      });
      this.socket.emit('find', { collection: 'goals' }, (err: Error, goals: Goals.Goal[]) => {
        this.goals = goals
      });
    },
    beforeDestroy: function () {
      clearInterval(this.interval)
    },
    methods: {
      removeGoal: function (uid) {
        console.debug(' => Removing', uid)

        this.socket.emit('delete', { collection: 'groups', where: { uid }}, (err, d) => {
          this.socket.emit('delete', { collection: 'goals', where: { groupId: uid } }, (err, d) => {
            this.groups = this.groups.filter(o => o.uid != uid)
          })
        })
      }
    }
  })
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