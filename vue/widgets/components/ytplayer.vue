<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#yt-song-requests" aria-controls="home" role="tab" data-toggle="tab" title="Song Requests">
          {{ requests.length }}
          <i class="fas fa-user" aria-hidden="true"></i>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#yt-player" aria-controls="home" role="tab" data-toggle="tab">
          <i class="fas fa-music" aria-hidden="true"></i>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title" data-lang="widget-title-ytplayer"></h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="yt-player">
        <div id="YTPlayer"></div>
        <div class="row">
          <div class="btn-group" role="group" aria-label="..." style="width: 100%; padding-left:15px; padding-right: 15px; height: 34px;">
            <button type="button" class="btn btn-success" id="YTControl">
              <i class="fas fa-play" aria-hidden="true"></i>
            </button>
            <button type="button" class="btn btn-secondary" onclick="skipSong()">
              <i class="fas fa-forward" aria-hidden="true"></i>
            </button>

            <div class="btn-group" role="group">
              <button type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <i class="fas fa-sliders-h"></i>
                <span class="caret"></span>
              </button>
              <div class="dropdown-menu">
                <h6 class="dropdown-header">SONG REQUEST</h6>
                <button class="dropdown-item" id="toggle-songrequest-btn" data-show-percentage="true" onclick="toggleSongsFromSongRequest()">
                  <i class="far fa-check-square" aria-hidden="true"></i> Play songs from song requests
                </button>


                <h6 class="dropdown-header">PLAYLIST</h6>
                <button class="dropdown-item" id="toggle-playlist-btn" data-show-percentage="true" onclick="toggleSongsFromPlaylist()">
                  <i class="far fa-check-square" aria-hidden="true"></i> Play songs from playlist
                </button>
                <button class="dropdown-item" id="percentage-btn" data-show-percentage="true" onclick="stealToPlaylist()">Steal to playlist</button>

                <h6 class="dropdown-header">OTHERS</h6>
                <button class="dropdown-item" id="percentage-btn" data-show-percentage="true" onclick="banSong()">Ban song</button>
              </div>
              <div style="height:34px; display: inline-block" id="volumeSliderContainer">

              </div>
            </div>
            <div class="progress" style="height:34px; padding-left:0px; padding-right: 0; width: 100%;">
              <div class="progress-bar progress-bar-danger" id="youtube-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                style="width: 0%;"></div>
            </div>
          </div>
        </div>

        <div style="font-size: 0.8rem" class="bg-faded">
          <span id="yt-player-currentsong"></span>
        </div>
      </div>
      <!-- /YT-PLAYER -->

      <div role="tabpanel" class="tab-pane" id="yt-song-requests">
        <table id="songRequestsWidget" class="table table-condensed"></table>
      </div>
      <!-- /YT-SONG-REQUESTS -->

      <div class="clearfix"></div>
    </div>
  </div>
</div>
</template>

<script>
export default {
  data () {
    return {
      requests: ['a', 'b']
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
}
</script>