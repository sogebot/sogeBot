<template>
<ul>
  <li
    v-for="event of events"
    :key="event._id"
    class="event"
    :class="[event.type]">
    <strong class="username">{{ event.username }}</strong>
    <span class="event">{{ event.summary }}</span>
  </li>
</ul>
</template>

<script>
  import _ from 'lodash'
  import io from 'socket.io-client';

  export default {
    props: ['token'],
    data: function () {
      return {
        socket: io('/overlays/eventlist', {query: "token="+token}),
        events: []
      }
    },
    created: function () {
      this.socket.emit('get')
      this.socket.on('events', (data) => {
        var order = this.urlParam('order') || 'desc'
        var display = this.urlParam('display') || 'username,event'; display = display.split(',')
        var ignore = this.urlParam('ignore') || ''; ignore = ignore.split(',')
        var count = this.urlParam('count') || 5

        console.debug({order, display, ignore, count})

        data = _.chunk(
          _.orderBy(
            // filter out ignored events
            _.filter(data, (o) => !_.includes(ignore, o.event))
            , 'timestamp', 'desc'), count)[0] // order by desc first to get chunk of data
        data = _.orderBy(data, 'timestamp', order) // re-order as set in order

        for (let event of data) {
          if (event.event === 'resub') event.summary = event.subStreak + 'x ' + translations['overlays-eventlist-resub']
          else if (event.event === 'cheer') event.summary = event.bits + ' ' + translations['overlays-eventlist-cheer']
          else if (event.event === 'tip') event.summary = event.currency + parseFloat(event.amount).toFixed(2)
          else event.summary = translations['overlays-eventlist-' + event.event]

          let generatedOutput = ''
          for (let toShow of display) {
            if (toShow === 'username') generatedOutput += `<strong class="username">${event.username}</strong>`
            else generatedOutput += `<span class="${toShow}">${event[toShow]}</span>`
          }
        }
        this.events = data
      })
    },
    methods: {
      urlParam: function (name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
          return null
        } else {
          return decodeURI(results[1]) || 0;
        }
      }
    }
  }
</script>

<style>
  @import url('https://fonts.googleapis.com/css?family=BenchNine');

  html, body {
    padding: 2px;
    padding-top: 10px;
    margin: auto;
    font-family: 'BenchNine', sans-serif;
    color: white;
  }

  ul {
    list-style-type: none;
    text-transform: uppercase;
    font-size: 1.6em;
    margin: 0;
    padding: 0;
    text-align: right;
  }

  ul li {
    width: 99%;
    margin-left: 0;
    text-shadow: 0 0 10px black, 0 0 20px black, 0 0 30px black;
  }

  ul li span {
    font-size: 0.6em;
  }

  ul li:nth-child(1) {
    opacity: 1;
    font-weight: bold;
  }

  ul li:nth-child(2) {
    opacity: 0.8;
  }

  ul li:nth-child(3) {
    opacity: 0.6;
  }

  ul li:nth-child(4) {
    opacity: 0.4;
  }

  ul li:nth-child(5) {
    opacity: 0.2;
  }
</style>