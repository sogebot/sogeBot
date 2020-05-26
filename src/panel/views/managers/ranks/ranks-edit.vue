<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.ranks') }}
          <template v-if="$route.params.id">
            <small><fa icon="angle-right"/></small>
            {{item.rank}}
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/ranks/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <b-form v-else>
      <b-form-group
        :label="translate('rank')"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model="item.rank"
            type="text"
            @input="$v.item.rank.$touch()"
            :state="$v.item.rank.$invalid && $v.item.rank.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.rank.$invalid && $v.item.rank.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>

      <b-form-group
        :label="translate('type')"
        label-for="type"
      >
        <b-form-select v-model="item.type" class="mb-3">
          <b-form-select-option value="viewer">Watch Time</b-form-select-option>
          <b-form-select-option value="follower">Follow time</b-form-select-option>
          <b-form-select-option value="subscriber">Sub time</b-form-select-option>
        </b-form-select>
      </b-form-group>

      <b-form-group
        :label="item.type === 'viewer' ? translate('hours') : translate('months')"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model.number="item.value"
            type="number"
            min="0"
            @input="$v.item.value.$touch()"
            :state="$v.item.value.$invalid && $v.item.value.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.value.$invalid && $v.item.value.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 0) }}</b-form-invalid-feedback>
      </b-form-group>
    </b-form>
  </b-container>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { Validations } from 'vuelidate-property-decorators';
import { required, minValue } from 'vuelidate/lib/validators'

import { v4 as uuid } from 'uuid';
import { RankInterface } from 'src/bot/database/entity/rank';

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
  filters: {
    capitalize(value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class ranksEdit extends Vue {
  socket = getSocket('/systems/ranks');

  state: {
    loading: number;
    save: number;
    pending: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
  }

  item: RankInterface = {
    id: uuid(),
    value: 0,
    rank: '',
    type: 'viewer',
  }


  @Validations()
  validations = {
    item: {
      rank: {required},
      value: {required, minValue: minValue(0)},
    }
  }

  @Watch('item', { deep: true })
  pending() {
    if (this.state.loading === this.$state.success) {
      this.state.pending = true;
    }
  }

  async mounted() {
    if (this.$route.params.id) {
      await new Promise(resolve => {
        this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, data: RankInterface) => {
          if (err) {
            return console.error(err);
          }
          console.debug('Loaded', data);
          this.item = data;
          resolve();
        })
      })
    }

    this.$nextTick(() => {
      this.state.loading = this.$state.success;
    })
  }

  del() {
    this.socket.emit('ranks::remove', this.$route.params.id, () => {
      this.$router.push({ name: 'ranksManagerList' })
    })
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

      this.socket.emit('ranks::save', this.item, (err: string | null, data: Required<RankInterface>) => {
        if (err) {
          this.state.save = this.$state.fail;
          console.error(err);
        } else {
          this.state.save = this.$state.success;
          this.state.pending = false;
          this.$router.push({ name: 'ranksManagerEdit', params: { id: String(data.id) } })
        }
        setTimeout(() => {
          this.state.save = this.$state.idle;
        }, 1000)
      });
    }
  }

  beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
    if (this.state.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }

  beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
    if (this.state.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }
}
</script>