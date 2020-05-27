<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.timers') }}
          <template v-if="$route.params.id">
            <small><fa icon="angle-right"/></small>
            {{item.command}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/price/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" icon="power-off" @click="item.enabled = !item.enabled">
          {{ translate('dialog.buttons.' + (item.enabled? 'enabled' : 'disabled')) }}
        </button-with-icon>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <b-form v-else>
      <b-form-group
        :label="translate('systems.price.command.name')"
        label-for="command"
      >
        <b-input-group>
          <b-form-input
            id="command"
            v-model="item.command"
            type="text"
            :placeholder="translate('systems.price.command.placeholder')"
            @input="$v.item.command.$touch()"
            :state="$v.item.command.$invalid && $v.item.command.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.command.$invalid && $v.item.command.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>

      <b-form-group
        :label="translate('systems.price.price.name')"
        label-for="price"
      >
        <b-input-group>
          <b-form-input
            id="price"
            v-model.number="item.price"
            type="number"
            min="1"
            :placeholder="translate('systems.price.price.placeholder')"
            @input="$v.item.price.$touch()"
            :state="$v.item.price.$invalid && $v.item.price.$dirty ? false : null"
          ></b-form-input>
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.price.$invalid && $v.item.price.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', '1') }}</b-form-invalid-feedback>
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
import { required, minValue } from 'vuelidate/lib/validators';

import { v4 as uuid } from 'uuid';
import { PriceInterface } from '../../../../bot/database/entity/price';

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'hold-button': () => import('../../../components/holdButton.vue'),
  }
})
export default class priceEdit extends Vue {
  socket = getSocket('/systems/price');

  state: {
    loading: number;
    save: number;
    pending: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
  }

  item: PriceInterface = {
    id: uuid(), command: '', price: 1, enabled: true
  }


  @Validations()
  validations = {
    item: {
      command: { required },
      price: { minValue: minValue(1), required },
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
      await new Promise((resolve, reject) => {
        this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, data: PriceInterface) => {
          if (err) {
            return console.error(err);
          }
          console.debug({price_data: data})
          this.item = data;
          resolve()
        })
      })
    }

    this.$nextTick(() => {
      this.state.loading = this.$state.success;
    })
  }

  del() {
    this.socket.emit('generic::deleteById', this.$route.params.id, (err: string | null) => {
      if (err) {
        return console.error(err);
      }
      this.$router.push({ name: 'PriceManagerList' })
    })
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

      this.socket.emit('price::save', this.item, (err: string | null) => {
        if (err) {
          this.state.save = this.$state.fail;
          return console.error(err);
        }

        this.state.save = this.$state.success;
        this.$nextTick(() => {
          this.state.pending = false;
          this.$router.push({ name: 'PriceManagerEdit', params: { id: String(this.item.id) } })
        })
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