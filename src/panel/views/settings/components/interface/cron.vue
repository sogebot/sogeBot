<template>
  <div class="input-group">
    <div class="d-flex w-100" style="height: fit-content">
      <div class="input-group-prepend">
        <span class="input-group-text">
          <template v-if="typeof translatedTitle === 'string'">
            <span v-html="translatedTitle" class="text-left"/>
          </template>
          <template v-else-if="typeof translatedTitle === 'object'">
            {{ translatedTitle.title }}
            <small style="cursor: help;" class="text-info ml-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
          </template>
        </span>
      </div>
      <div class="d-block w-100 p-0 border-0" style="height: fit-content">
        <input v-model="currentValue" v-on:keyup="update" class="form-control" />
        <b-list-group>
          <b-list-group-item v-for="timestamp of data" :key="timestamp">{{ new Date(timestamp).toUTCString() }}</b-list-group-item>
        </b-list-group>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

@Component({})
export default class cronInput extends Vue {
  @Prop() readonly emit: any;
  @Prop() readonly title!: string;
  @Prop() readonly value: any;

  data: number[] = [];
  currentValue = this.value;
  translatedTitle = this.translate(this.title);

  mounted() {
    this.update();
  }

  update() {
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit(this.emit, this.currentValue, (err: string | null, data: number[]) => {
        if (err) {
          console.error(err)
        } else {
          this.data = data;
        }
      });
    this.$emit('update', { value: this.currentValue });
  }
};
</script>
