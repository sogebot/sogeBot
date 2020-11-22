<template>
  <div class="input-group">
    <div class="d-block w-100 p-0 border-0" style="height: fit-content">
      <b-list-group>
        <b-list-group-item v-for="(xp, idx) in data" :key="'Level '+ idx + ': ' + xp">Level {{ idx + 1 }}: {{ xp }}</b-list-group-item>
      </b-list-group>
    </div>
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
