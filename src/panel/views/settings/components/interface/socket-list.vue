<template>
  <b-table striped small hover :items="data" :fields="fields" class="mt-3">
    <template v-slot:cell(accessTokenTimestamp)="data">
      {{ new Date(data.item.accessTokenTimestamp).toLocaleString() }}
    </template>
    <template v-slot:cell(refreshTokenTimestamp)="data">
      {{ new Date(data.item.refreshTokenTimestamp).toLocaleString() }}
    </template>
    <template v-slot:cell(buttons)="data">
      <div class="text-right">
        <b-btn variant="danger" @click="remove(data.item)">{{ translate('delete') }}</b-btn>
      </div>
    </template>
  </b-table>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

@Component({})
export default class cronInput extends Vue {
  @Prop() readonly title: any;

  data: any[] = [];
  translatedTitle = this.translate(this.title);

  fields = [
    { key: 'userId' },
    { key: 'type' },
    { key: 'accessTokenTimestamp' },
    { key: 'refreshTokenTimestamp' },
    { key: 'buttons', label: ''  },
  ]

  mounted() {
    this.update();
  }

  remove(item) {
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit('removeConnection', item, () => {
        this.data = this.data.filter(o => o.id != item.id)
      })
  }

  update() {
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit('listConnections', (err, data: any[]) => {
        if (err) {
          console.error(err)
        } else {
          this.data = data;
        }
      });
  }
};
</script>
