<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.keywords') }}
          <template v-if="$route.params.id">
            <small><i class="fas fa-angle-right"></i></small>
            {{event.name}}
            <small>{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/keywords/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button :if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ enabled ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" icon="power-off" @click="enabled = !enabled">
          {{ translate('dialog.buttons.' + (enabled? 'enabled' : 'disabled')) }}
        </button-with-icon>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid"/>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <b-form v-else>
      <b-form-group
        :label="translate('manage.keywords.keyword.name')"
        label-for="keyword"
      >
        <b-form-input
          id="keyword"
          v-model="keyword"
          type="text"
          :placeholder="translate('manage.keywords.keyword.placeholder')"
          :state="$v.keyword.$invalid ? 'invalid' : null"
        ></b-form-input>
        <b-form-invalid-feedback>{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
        <small class="form-text text-muted" v-html="translate('manage.keywords.keyword.help')"></small>
      </b-form-group>
      <b-form-group
        :label="translate('manage.keywords.response.name')"
        label-for="response"
      >
        <b-form-textarea
          id="response"
          v-model="response"
          :placeholder="translate('manage.keywords.response.placeholder')"
          :state="$v.response.$invalid ? 'invalid' : null"
          rows="8"
        ></b-form-textarea>
        <b-form-invalid-feedback>{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
        <small class="form-text text-muted" v-html="translate('manage.keywords.response.help')"></small>
      </b-form-group>
    </b-form>
  </b-container>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';

import { Validate } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators'

import uuid from 'uuid/v4';

import { KeywordInterface } from '../../../../bot/systems/keywords';

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
})
export default class keywordsEdit extends Vue {
  socket = io('/systems/keywords', { query: "token=" + this.token });

  state: {
    loading: ButtonStates;
    save: ButtonStates;
    pending: boolean;
  } = {
    loading: ButtonStates.progress,
    save: ButtonStates.idle,
    pending: false,
  }

  id: string = uuid();
  @Validate({ required })
  keyword: string = '';
  @Validate({ required })
  response: string = '';
  enabled: boolean = true;

  @Watch('enabled')
  @Watch('keyword')
  @Watch('response')
  pending() {
    this.state.pending = true;
  }

  mounted() {
    if (this.$route.params.id) {
      this.socket.emit('findOne', { where: { id: this.$route.params.id } }, (err, data: KeywordInterface) => {
        if (err) {
          return console.error(err)
        }

        this.id = data.id;
        this.keyword = data.keyword;
        this.response = data.response;
        this.enabled = data.enabled;

        this.state.loading = ButtonStates.success;
      })
    } else {
      this.state.loading = ButtonStates.success;
    }
  }
}
</script>

<style scoped>
</style>
