<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#bets-running" aria-controls="home" role="tab" data-toggle="tab" title="Betting">
          {{ title }}
          <font-awesome-icon :icon='["far", "clock"]'></font-awesome-icon>
          <template v-if="timer !== null">{{ timer | formatTime }}</template>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#bets-settings" aria-controls="home" role="tab" data-toggle="tab" title="Settings">
          <font-awesome-icon icon='cog'></font-awesome-icon>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{commons.translate('widget-title-bets')}}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" style="overflow:hidden;" id="bets-running">
        <template v-if="timer !== null">
          <div v-for="(option, index) of options" :key="option.name" class="pb-2">
            <div class="progress" style="height: 35px; cursor: pointer;" @click="close(index)">
              <div
                class="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                :style="{width: getBetsPercentage(index)}"
                style = "font-size: 1rem; text-shadow: 0px 0px 1px rgba(150, 150, 150, 1), 0px 0px 2px rgba(150, 150, 150, 1), 0px 0px 3px rgba(150, 150, 150, 1), 0px 0px 4px rgba(150, 150, 150, 1), 0px 0px 5px rgba(150, 150, 150, 1), 0px 0px 6px rgba(150, 150, 150, 1)"
              >
                <span class="ml-1 mr-1 text-left">{{ option.name }} ({{getBets(index)}})</span>
              </div>
            </div>
          </div>
          <div class="pb-2">
            <button class='btn btn-block btn-danger p-1 text-left' @click="close('refund')">
              {{commons.translate('refund') | capitalize}}
            </button>
          </div>
        </template>
        <div v-else class="alert alert-info">No bets are currently running</div>
      </div> <!-- /BETS -->

      <div role="tabpanel" class="tab-pane" id="bets-settings">
        <div class="input-group">
          <div class="input-group-prepend">
              <span class="input-group-text">{{commons.translate('gain-every-option')}}</span>
          </div>
          <input type="text" class="form-control" v-model="betPercentGain">
          <div class="input-group-append">
              <span class="input-group-text">%</span>
          </div>
        </div>
      </div> <!-- /SETTINGS -->

      <div class="clearfix"></div>
    </div>
  </div>
</div>
</template>

<script>
import { library } from '@fortawesome/fontawesome-svg-core'
import { faClock } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCog } from '@fortawesome/free-solid-svg-icons';

library.add(faClock, faCog)

export default {
  props: ['commons', 'token'],
  mounted: function () {
    this.$emit('mounted')
  },
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  data: function () {
    return {
      socket: io('/widgets/bets', {query: "token=" + this.token}),
      betPercentGain: 0,

      locked: false,
      options: [],
      timer: null,
      title: ''
    }
  },
  watch: {
    betPercentGain: function (value, old) {
      if (_.isNaN(Number(value))) this.betPercentGain = old
      else {
        this.socket.emit('settings.update', {betPercentGain: value}, () => {})
      }
    }
  },
  created: function () {
    setInterval(() => this.socket.emit('data', (_current, _bets) => {
      if (!_.isEmpty(_current)) {
        this.locked = _current.locked
        this.options = _current.options
        this.timer = Number((Number(_current.end) - new Date().getTime()) / 1000).toFixed(0)
        if (this.timer <= 0) this.timer = 0
        this.title = _current.title
      } else {
        this.title = ''
        this.timer = null,
        this.options = []
      }
      this.bets = _bets
    }), 1000)
    this.socket.emit('settings', (err, data) => { this.betPercentGain = data.betPercentGain })
  },
  methods: {
    close: function (index) {
      this.socket.emit('close', index)
    },
    getBetsPercentage: function (index) {
      if (this.bets.length === 0) return 0

      let percentage = (100 / this.bets.length) * this.bets.filter(o => o.option === index).length + '%'
      return percentage === '0%' ? '0' : percentage
    },
    getBets: function (index) {
      return this.bets.filter(o => o.option === index).length
    }
  },
  filters: {
    capitalize: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    formatTime: function (seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [
        h,
        m > 9 ? m : (h ? '0' + m : m || '0'),
        s > 9 ? s : '0' + s,
      ].filter(a => a).join(':');
    }
  },
}
/*
  const betsSocket = io('/widgets/bets', {query: "token="+token})
  let selected = null

  var customTooltips = function(tooltip) {
    $(this._chart.canvas).css('cursor', 'pointer');

    if (!_.isNil(tooltip.dataPoints) && tooltip.dataPoints.length > 0) {
      tooltip.dataPoints.forEach(function(dataPoint) {
        selected = dataPoint.xLabel.startsWith(translations['refund']) ? 'refund' : dataPoint.index
      })
    }
  }

  var bets = {
    dataset: [],
    end: 0,
    updateTimer: function () {
      // update timer
      var timeLeft = bets.end - new Date().getTime()
      if (timeLeft < 0) {
        $("#betEndTimer").html('--:--')
      } else {
        var date = new Date(timeLeft)
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        $("#betEndTimer").text(minutes.substr(-2) + ':' + seconds.substr(-2))
        setTimeout(() => bets.updateTimer(), 1000)
      }
    },
    updateBet: function (_current, _bets) {
      let cIndex = 0
      let oIndex = 0

      const _total = _bets.length

      var ctx = document.getElementById("bets-container").getContext('2d');
      if (!_.isNil(_current) && !_.isEmpty(_current)) {
        bets.end = _current.end
        $('#betTitle').text(_current.title)

        let labels = []
        let dataset = []
        for (let option of _current.options) {
          let percentage = 0
          if (_total !== 0) percentage = _.filter(_bets, (o) => o.option === oIndex).length / (_total / 100)
          labels.push(option.name)
          dataset.push(percentage)
          oIndex++
        }

        labels.push(translations['refund'])
        dataset.push(0)

        if (!_.isEqual(dataset, bets.dataset)) {
          var myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: dataset,
                    borderWidth: 1,
                    backgroundColor: [
                      'blue', 'red', 'orange', 'green', 'purple', 'yellow', 'pink', 'cyan'
                    ]
                }]
            },
            options: {
                onClick: () => {
                  if (!_.isNil(selected)) betsSocket.emit('close', selected)
                  selected = null
                },
                maintainAspectRatio: false,
                legend: {
                  display: false
                },
                tooltips: {
                  enabled: true,
                  mode: 'index',
                  intersect: false,
                  custom: customTooltips
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true,
                            min: 0,
                            max: 100,
                            stepSize: 25
                        }
                    }]
                }
            }
        })
        }
        bets.dataset = dataset
        bets.updateTimer()
        commons.translate()
      } else {
        bets.dataset = []
        bets.end = new Date().getTime()
        $('#betTitle').text('---')
        $("#bets-running").empty().append(`<canvas id="bets-container" class="p-2"></canvas>`)
      }
    }
  }

  setInterval(() => betsSocket.emit('data', (_current, _bets) => bets.updateBet(_current, _bets)), 1000)

  betsSocket.emit('config', (data) => {
    $("#bets-percent-gain").val(data.betPercentGain)
  })

  var $betPercentGainInput = $('#bets-percent-gain')
  $betPercentGainInput.off()
  $betPercentGainInput.on('focusout', function() {
    var value = $betPercentGainInput.val()
    var data = {}
    data['betPercentGain'] = value
    betsSocket.emit('saveConfiguration', data)
  })
*/
</script>
