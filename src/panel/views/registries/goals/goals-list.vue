<template>
  <div
    ref="window"
    class="container-fluid"
  >
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.goals') }}
        </span>
      </div>
    </div>

    <panel
      cards
      search
      @search="search = $event"
    >
      <template #left>
        <button-with-icon
          class="btn-primary btn-reverse"
          icon="plus"
          href="#/registry/goals/edit"
        >
          {{ translate('registry.goals.addGoalGroup') }}
        </button-with-icon>
      </template>
    </panel>

    <div
      v-for="(chunk, index) of chunk(orderBy(groupsFiltered, 'createdAt', 'desc'), itemsPerPage)"
      :key="index"
      class="card-deck"
    >
      <div
        v-for="group of chunk"
        :key="group.id"
        class="card mb-2 p-0"
        :class="['col-' + (12 / itemsPerPage)]"
      >
        <div class="card-header">
          <strong>{{ group.name }}</strong> <small class="text-muted">{{ group.id }}</small>
        </div>
        <div class="card-body">
          <dl class="row">
            <dt class="col-6">
              {{ translate('registry.goals.input.displayAs.title') }}
            </dt>
            <dd class="col-6">
              {{ group.display.type }}
            </dd>
            <template v-if="group.display.type === 'fade'">
              <dt class="col-6">
                {{ translate('registry.goals.input.durationMs.title') }}
              </dt>
              <dd class="col-6">
                {{ group.display.durationMs }}ms
              </dd>
              <dt class="col-6">
                {{ translate('registry.goals.input.animationInMs.title') }}
              </dt>
              <dd class="col-6">
                {{ group.display.animationInMs }}ms
              </dd>
              <dt class="col-6">
                {{ translate('registry.goals.input.animationOutMs.title') }}
              </dt>
              <dd class="col-6">
                {{ group.display.animationOutMs }}ms
              </dd>
            </template>
          </dl>
          <ul class="list-group list-group-flush border-top-0">
            <li
              v-for="goal of group.goals"
              :key="goal.id"
              class="list-group-item"
            >
              <dl class="row">
                <h5 class="col-12">
                  {{ goal.name }}
                </h5>
                <dt class="col-6">
                  {{ translate('registry.goals.input.type.title') }}
                </dt>
                <dd class="col-6">
                  {{ goal.type }}
                </dd>

                <dt
                  v-if="goal.type === 'tips'"
                  class="col-6"
                >
                  {{ translate('registry.goals.input.countBitsAsTips.title') }}
                </dt>
                <dd
                  v-if="goal.type === 'tips'"
                  class="col-6"
                >
                  {{ !!goal.countBitsAsTips }}
                </dd>

                <dt class="col-6">
                  {{ translate('registry.goals.input.goalAmount.title') }}
                </dt>
                <dd class="col-6">
                  {{ goal.goalAmount }}
                </dd>

                <dt class="col-6">
                  {{ translate('registry.goals.input.endAfter.title') }}
                </dt>
                <dd class="col-6">
                  <fa
                    v-if="goal.endAfterIgnore"
                    icon="infinity"
                    fixed-width
                  />
                  <template v-else>
                    {{ new Date(goal.endAfter).toLocaleString() }}
                  </template>
                </dd>
              </dl>
            </li>
          </ul>
        </div>
        <div class="card-footer text-right">
          <button-with-icon
            class="btn-only-icon btn-secondary btn-reverse"
            icon="clone"
            @click="clone(group)"
          />
          <hold-button
            class="btn-danger btn-only-icon"
            icon="trash"
            @trigger="removeGoal(group)"
          >
            <template slot="title">
              {{ translate('dialog.buttons.delete') }}
            </template>
            <template slot="onHoldTitle">
              {{ translate('dialog.buttons.hold-to-delete') }}
            </template>
          </hold-button>
          <button-with-icon
            :text="'/overlays/goals/' + group.id"
            :href="'/overlays/goals/' + group.id"
            class="btn-dark btn-only-icon"
            icon="link"
            target="_blank"
          />
          <button-with-icon
            :text="translate('dialog.buttons.edit')"
            :href="'#/registry/goals/edit/' + group.id"
            class="btn-primary btn-only-icon"
            icon="edit"
          />
        </div>
      </div>

      <!-- add empty cards -->
      <template v-if="chunk.length !== itemsPerPage">
        <div
          v-for="i in itemsPerPage - (chunk.length % itemsPerPage)"
          :key="i"
          class="card col-4"
          style="visibility: hidden"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faClone } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  chunk, filter, orderBy,
} from 'lodash-es';
import { v4 as uuid } from 'uuid';
import Vue from 'vue';

import { GoalGroupInterface } from 'src/bot/database/entity/goal';

library.add(faClone);

export default Vue.extend({
  components: {
    panel:              () => import('../../../components/panel.vue'),
    holdButton:         () => import('../../../components/holdButton.vue'),
    'button-with-icon': () => import('../../../components/button.vue'),
  },
  data: function () {
    const object: {
      translate: typeof translate,
      groups: GoalGroupInterface[],
      socket: any,
      search: string,
      currentTime: any,
      domWidth: number,
      interval: number,
      isMounted: boolean,
      chunk: any,
      filter: any,
      orderBy: any,
    } = {
      translate:   translate,
      socket:      getSocket('/overlays/goals'),
      search:      '',
      groups:      [],
      currentTime: 0,
      domWidth:    0,
      interval:    0,
      isMounted:   false,
      chunk:       chunk,
      filter:      filter,
      orderBy:     orderBy,
    };
    return object;
  },
  computed: {
    groupsFiltered: function (): GoalGroupInterface[] {
      return this.groups.filter((o: GoalGroupInterface) => {
        return o.name.includes(this.search);
      });
    },
    itemsPerPage: function () {
      if(!this.isMounted) {
        return 3;
      } else {
        if (this.domWidth > 1400) {
          return 3;
        } else if (this.domWidth > 850) {
          return 2;
        } else {
          return 1;
        }
      }
    },
  },
  mounted: function() {
    this.domWidth = (this.$refs.window as HTMLElement).clientWidth;
    this.currentTime = Date.now();
    this.isMounted = true;
    this.interval = window.setInterval(() => {
      this.domWidth = (this.$refs.window as HTMLElement).clientWidth;
      this.currentTime = Date.now();
    }, 1000);

    this.refresh();
  },
  beforeDestroy: function () {
    clearInterval(this.interval);
  },
  methods: {
    refresh() {
      this.socket.emit('generic::getAll', (err: Error, items: GoalGroupInterface[]) => {
        if (err) {
          console.error(err);
        } else {
          console.debug('Loaded', items);
          this.groups = items;
        }
      });
    },
    clone(group: GoalGroupInterface) {
      const clonedGroupId = uuid();
      const clonedGroup = {
        ...group,
        id:    clonedGroupId,
        name:  group.name + ' (clone)',
        goals: group.goals.map(goal => ({
          ...goal, id: uuid(), groupId: clonedGroupId,
        })),
      };
      this.socket.emit('goals::save', clonedGroup, (err: string | null) => {
        if (err) {
          console.error(err);
        }
        this.refresh();
      });
    },
    removeGoal: function (group: GoalGroupInterface) {
      console.debug(' => Removing', group.id);

      this.socket.emit('goals::remove', group, (err: string | null) => {
        if (err) {
          console.error(err);
        } else {
          this.groups = this.groups.filter(o => o.id != group.id);
        }
      });
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