<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.keywords') }}
          <template v-if="$route.params.id">
            <small><fa icon="angle-right"/></small>
            {{keyword}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/keywords/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ enabled ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" icon="power-off" @click="enabled = !enabled">
          {{ translate('dialog.buttons.' + (enabled? 'enabled' : 'disabled')) }}
        </button-with-icon>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
    <b-form v-else>
      <b-form-group
        :label="translate('systems.keywords.keyword.name')"
        label-for="keyword"
      >
        <b-form-input
          id="keyword"
          v-model="keyword"
          type="text"
          :placeholder="translate('systems.keywords.keyword.placeholder')"
          :state="$v.keyword.$invalid && $v.keyword.$dirty ? false : null"
          @input="$v.keyword.$touch()"
        ></b-form-input>
        <b-form-invalid-feedback :state="!($v.keyword.$invalid && $v.keyword.$dirty)">
          <template v-if="!$v.keyword.isValidRegex">{{ translate('errors.invalid_regexp_format') }}</template>
          <template v-else>{{ translate('dialog.errors.required') }}</template>
        </b-form-invalid-feedback>
        <small class="form-text text-muted" v-html="translate('systems.keywords.keyword.help')"></small>
      </b-form-group>
      <b-form-group
        :label="translate('systems.keywords.response.name')"
        label-for="response"
      >
        <b-form-textarea
          id="response"
          v-model="response"
          :placeholder="translate('systems.keywords.response.placeholder')"
          :state="$v.response.$invalid && $v.response.$dirty ? false : null"
          rows="8"
          @input="$v.response.$touch()"
        ></b-form-textarea>
        <b-form-invalid-feedback :state="!($v.response.$invalid && $v.response.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>
    </b-form>
  </b-container>
</template>
<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

import { Validate } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators'

import { v4 as uuid } from 'uuid';
import { KeywordInterface } from 'src/bot/database/entity/keyword';

const isValidRegex = (val) => {
  try {
    new RegExp(val);
    return true;
  } catch (e) {
    return false;
  }
}

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  },
})
export default class keywordsEdit extends Vue {
  socket = getSocket('/systems/keywords');

  state: {
    loading: number;
    save: number;
    pending: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
  }

  id: string = uuid();
  @Validate({ required, isValidRegex })
  keyword: string = '';
  @Validate({ required })
  response: string = '';
  enabled: boolean = true;

  @Watch('enabled')
  @Watch('keyword')
  @Watch('response')
  pending() {
    if (this.state.loading === this.$state.success) {
      this.state.pending = true;
    }
  }

  mounted() {
    if (this.$route.params.id) {
      this.socket.emit('keywords::getById', this.$route.params.id, (err, data: Required<KeywordInterface>) => {
        if (err) {
          return console.error(err)
        }

        this.id = data.id;
        this.keyword = data.keyword;
        this.response = data.response;
        this.enabled = data.enabled;

        this.$nextTick(() => {
          this.state.loading = this.$state.success;
        });
      })
    } else {
      this.state.loading = this.$state.success;
    }
  }

  del() {
    this.socket.emit('keywords::deleteById', this.$route.params.id, () => {
      this.$router.push({ name: 'KeywordsManagerList' })
    })
  }

  save() {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      const keyword: KeywordInterface = {
        id: this.id,
        keyword: this.keyword,
        response: this.response,
        enabled: this.enabled,
      }
      this.state.save = this.$state.progress;

      this.socket.emit('keywords::save', keyword, (err, data) => {
        if (err) {
          this.state.save = this.$state.fail;
          return console.error(err);
        }

        this.state.save = this.$state.success;
        this.state.pending = false;
        this.$router.push({ name: 'KeywordsManagerEdit', params: { id: String(data.id) } })
        setTimeout(() => {
          this.state.save = this.$state.idle;
        }, 1000)
      });
    }
  }
}
</script>
