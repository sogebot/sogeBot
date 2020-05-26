<template>
  <div class="d-flex">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small class="text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <b-form-select v-model="currentValue" :options="guilds"></b-form-select>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

type Guild = { text: string, value: string };

@Component({})
export default class discordGuild extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly title!: string;

  socket = getSocket('/integrations/discord')
  guilds: Guild[] = []

  currentValue = this.value;
  translatedTitle = this.translate(this.title);

  mounted() {
    this.socket.emit('discord::getGuilds', (err: string | null, guilds: Guild[]) => {
      console.groupCollapsed('discord::getGuilds')
      console.log({guilds});
      console.groupEnd();
      if (err) {
        return console.error(err);
      }

      if (!guilds.find(o => String(o.value) === String(this.currentValue))) {
        this.currentValue = '';
      }
      this.guilds = [{ value: '', text: `-- ${this.translate('integrations.discord.settings.noGuildSelected')} --` }, ...guilds];
    });
  }

  @Watch('currentValue')
  onChange() {
    this.$emit('update', { value: this.currentValue });
  }
};
</script>
