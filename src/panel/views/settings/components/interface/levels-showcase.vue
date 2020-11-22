<template>
  <div class="input-group">
    <b-row class="w-100">
      <b-col>
        <b-table-simple small>
          <b-tr v-for="(xp, idx) in data" :key="'Level '+ idx + ': ' + xp" v-show="idx > 0 && idx < 8">
            <b-td style="vertical-align: middle">{{idx}}</b-td>
            <b-td style="vertical-align: middle">{{xp}}</b-td>
          </b-tr>
        </b-table-simple>
      </b-col>
      <b-col>
        <b-table-simple small>
          <b-tr v-for="(xp, idx) in data" :key="'Level '+ idx + ': ' + xp" v-show="idx >= 8 && idx < 15">
            <b-td style="vertical-align: middle">{{idx}}</b-td>
            <b-td style="vertical-align: middle">{{xp}}</b-td>
          </b-tr>
        </b-table-simple>
      </b-col>
      <b-col>
        <b-table-simple small>
          <b-tr v-for="(xp, idx) in data" :key="'Level '+ idx + ': ' + xp" v-show="idx >= 15">
            <b-td style="vertical-align: middle">{{idx}}</b-td>
            <b-td style="vertical-align: middle">{{xp}}</b-td>
          </b-tr>
        </b-table-simple>
      </b-col>
    </b-row>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import translate from 'src/panel/helpers/translate';

@Component({})
export default class cronInput extends Vue {
  translate = translate;

  @Prop() readonly emit: any;
  @Prop() readonly title!: string;
  @Prop() readonly value!: any;

  data: string[] = [];
  translatedTitle = translate(this.title);

  mounted() {
    this.update();
  }

  update() {
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit(this.emit, (err: string | null, data: string[]) => {
        if (err) {
          console.error(err)
        } else {
          this.data = data;
        }
      });
  }
};
</script>
