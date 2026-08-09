(function () {
  "use strict";

  const playlist = window.PLAYLIST;
  let index = Math.floor(Math.random() * playlist.length);
  let player = null;
  let ready = false;
  let tickId = null;
  let youtubeLoading = false;
  const readyCallbacks = [];

  const els = {
    miniCover: document.getElementById("mini-cover"),
    miniTitle: document.getElementById("mini-title"),
    miniArtist: document.getElementById("mini-artist"),
    playBtn: document.getElementById("play-btn"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),
    iconPlay: document.getElementById("icon-play"),
    iconPause: document.getElementById("icon-pause"),
    volumeBtn: document.getElementById("volume-btn"),
    iconVolume: document.getElementById("icon-volume"),
    iconMuted: document.getElementById("icon-muted"),
    volumeSlider: document.getElementById("volume-slider"),
    volumeWrap: document.getElementById("volume-wrap"),
    miniIconPlay: document.getElementById("mini-icon-play"),
    miniIconPause: document.getElementById("mini-icon-pause"),
    playerShell: document.getElementById("player-shell"),
    playerToggle: document.getElementById("player-toggle"),
    minimizeBtn: document.getElementById("minimize-btn"),
    currentTime: document.getElementById("current-time"),
    duration: document.getElementById("duration"),
    progressBar: document.getElementById("progress-bar"),
    status: document.getElementById("player-status"),
  };

  function formatTime(seconds) {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function coverUrl(id) {
    return "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";
  }

  function setStatus(message) {
    els.status.textContent = message;
  }

  function updateUI() {
    const track = playlist[index];
    els.miniTitle.textContent = track.title;
    els.miniArtist.textContent = track.artist;
    els.miniCover.src = coverUrl(track.id);
    els.miniCover.alt = "";
  }

  function setPlaying(playing) {
    els.iconPlay.classList.toggle("hidden", playing);
    els.iconPause.classList.toggle("hidden", !playing);
    els.miniIconPlay.classList.toggle("hidden", playing);
    els.miniIconPause.classList.toggle("hidden", !playing);
    els.playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    els.playerShell.classList.toggle("is-playing", playing);
  }

  function updateProgress() {
    if (!player || !ready) return;
    const current = player.getCurrentTime();
    const total = player.getDuration();
    els.currentTime.textContent = formatTime(current);
    els.duration.textContent = formatTime(total);
    const pct = total > 0 ? (current / total) * 100 : 0;
    els.progressBar.value = String(pct);
    els.progressBar.style.setProperty("--progress", pct + "%");
  }

  function startTick() {
    stopTick();
    tickId = setInterval(updateProgress, 400);
  }

  function stopTick() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function loadTrack(autoPlay) {
    const track = playlist[index];
    updateUI();
    if (!player || !ready) return;
    player.loadVideoById(track.id);
    if (autoPlay) {
      setStatus("Loading " + track.title + "…");
      player.playVideo();
      setPlaying(true);
      startTick();
    } else {
      setPlaying(false);
      stopTick();
      els.currentTime.textContent = "0:00";
      els.duration.textContent = "0:00";
      els.progressBar.value = "0";
      els.progressBar.style.setProperty("--progress", "0%");
    }
  }

  function next() {
    if (window.roomClient && window.roomClient.isActive()) {
      index = (index + 1) % playlist.length;
      loadTrack(true);
      return window.roomClient.command("MUSIC_NEXT", 0);
    }
    index = (index + 1) % playlist.length;
    loadTrack(true);
  }

  function prev() {
    if (window.roomClient && window.roomClient.isActive()) {
      index = (index - 1 + playlist.length) % playlist.length;
      loadTrack(true);
      return window.roomClient.command("MUSIC_PREVIOUS", 0);
    }
    index = (index - 1 + playlist.length) % playlist.length;
    loadTrack(true);
  }

  function togglePlay() {
    if (window.roomClient && window.roomClient.isActive()) {
      if (!player || !ready) {
        setStatus("Music player is still loading…");
        return;
      }
      const playing = player.getPlayerState() === YT.PlayerState.PLAYING;
      if (playing) {
        player.pauseVideo();
        setPlaying(false);
        stopTick();
      } else {
        // This runs directly inside the user click, so browsers permit audio.
        player.playVideo();
        setPlaying(true);
        startTick();
      }
      return window.roomClient.command(playing ? "MUSIC_PAUSE" : "MUSIC_PLAY", getPosition());
    }
    if (!player || !ready) {
      setStatus("Loading YouTube player…");
      initYouTube(function () {
        player.playVideo();
        setPlaying(true);
        startTick();
      });
      return;
    }
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      setPlaying(false);
      stopTick();
    } else {
      player.playVideo();
      setPlaying(true);
      startTick();
    }
  }

  function seek(fraction) {
    if (!player || !ready) return;
    const total = player.getDuration();
    if (total > 0) {
      if (window.roomClient && window.roomClient.isActive()) {
        player.seekTo(total * fraction, true);
        updateProgress();
        return window.roomClient.command("MUSIC_SEEK", total * fraction);
      }
      player.seekTo(total * fraction, true);
      updateProgress();
    }
  }

  function initYouTube(onReady) {
    if (onReady) readyCallbacks.push(onReady);

    if (player && ready) {
      const callback = readyCallbacks.shift();
      if (callback) callback();
      return;
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    if (youtubeLoading) return;
    youtubeLoading = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = function () {
      youtubeLoading = false;
      setStatus("Unable to load the music service");
    };
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = function () {
      createPlayer();
    };
  }

  function setMuted(muted) {
    els.iconVolume.classList.toggle("hidden", muted);
    els.iconMuted.classList.toggle("hidden", !muted);
    els.volumeBtn.setAttribute("aria-label", muted ? "Volume muted — show volume controls" : "Show volume controls");
    try {
      localStorage.setItem("kshaura-angadi-muted", String(muted));
    } catch (_) {
      // Playback still works when browser storage is unavailable.
    }
  }

  function toggleVolumeControls() {
    const open = els.playerShell.classList.toggle("volume-open");
    els.volumeBtn.setAttribute("aria-expanded", String(open));
  }

  function collapsePlayer() {
    els.playerShell.classList.remove("expanded");
    els.playerToggle.setAttribute("aria-expanded", "false");
  }

  function createPlayer() {
    if (player) return;
    const track = playlist[index];
    player = new YT.Player("yt-player", {
      height: "1",
      width: "1",
      videoId: track.id,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: function () {
          ready = true;
          updateUI();
          player.setVolume(75);
          let savedVolume = 75;
          try {
            const storedVolume = localStorage.getItem("kshaura-angadi-volume");
            if (storedVolume !== null) savedVolume = Math.max(0, Math.min(100, Number(storedVolume)));
          } catch (_) {}
          els.volumeSlider.value = String(savedVolume);
          player.setVolume(savedVolume);
          let shouldMute = false;
          try {
            shouldMute = localStorage.getItem("kshaura-angadi-muted") === "true";
          } catch (_) {}
          if (shouldMute || savedVolume === 0) player.mute();
          setMuted(shouldMute || savedVolume === 0);
          setStatus("Ready to play");
          while (readyCallbacks.length) {
            readyCallbacks.shift()();
          }
        },
        onStateChange: function (event) {
          if (window.roomClient && window.roomClient.isApplying()) return;
          if (event.data === YT.PlayerState.ENDED) {
            next();
          } else if (event.data === YT.PlayerState.PLAYING) {
            setStatus("Now playing");
            setPlaying(true);
            startTick();
          } else if (event.data === YT.PlayerState.PAUSED) {
            setStatus("Paused");
            setPlaying(false);
            stopTick();
          } else if (event.data === YT.PlayerState.BUFFERING) {
            setStatus("Buffering…");
          }
        },
        onError: function () {
          setPlaying(false);
          stopTick();
          setStatus("Playback unavailable for this track");
        },
      },
    });
  }

  els.playBtn.addEventListener("click", togglePlay);
  els.volumeBtn.addEventListener("click", toggleVolumeControls);
  els.volumeSlider.addEventListener("input", function () {
    const volume = Number(els.volumeSlider.value);
    try {
      localStorage.setItem("kshaura-angadi-volume", String(volume));
    } catch (_) {}
    if (!player || !ready) {
      setStatus("Volume will apply when player is ready");
      return;
    }
    player.setVolume(volume);
    if (volume === 0) player.mute();
    else player.unMute();
    setMuted(volume === 0);
    setStatus(volume === 0 ? "Muted" : "Volume " + volume + "%");
  });
  els.playerToggle.addEventListener("click", function (event) {
    if (event.target.closest(".mini-play")) {
      togglePlay();
      return;
    }
    const expanded = els.playerShell.classList.toggle("expanded");
    els.playerToggle.setAttribute("aria-expanded", String(expanded));
  });
  els.minimizeBtn.addEventListener("click", function () {
    collapsePlayer();
  });
  document.addEventListener("click", function (event) {
    if (
      els.playerShell.classList.contains("expanded") &&
      !event.target.closest("#player-shell") &&
      event.target.closest(".app, .wallpaper, .overlay")
    ) {
      collapsePlayer();
    }
  });
  els.nextBtn.addEventListener("click", next);
  els.prevBtn.addEventListener("click", prev);

  els.progressBar.addEventListener("input", function () {
    seek(Number(els.progressBar.value) / 100);
  });

  function getPosition() { return player && ready ? player.getCurrentTime() : 0; }
  window.musicPlayer = {
    getIndex: function () { return index; },
    getPosition: getPosition,
    applyRoomState: function (state) {
      const targetIndex = playlist.findIndex(function (track) { return track.id === state.songId; });
      if (targetIndex < 0) return;
      const target = Math.max(0, state.position + (state.isPlaying ? (Date.now() - state.updatedAt) / 1000 : 0));
      const apply = function () {
        const alreadyOnTrack = index === targetIndex;
        index = targetIndex;
        updateUI();
        const localPosition = player.getCurrentTime();
        const currentlyPlaying = player.getPlayerState() === YT.PlayerState.PLAYING;
        if (!alreadyOnTrack) {
          player.loadVideoById(playlist[index].id, target);
        } else if (Math.abs(localPosition - target) > 2) {
          player.seekTo(target, true);
        }
        // Do not restart an already-playing local player after its own command
        // returns from the server: that would turn a click into blocked autoplay.
        if (state.isPlaying && !currentlyPlaying) { player.playVideo(); setPlaying(true); startTick(); }
        else if (!state.isPlaying && currentlyPlaying) { player.pauseVideo(); setPlaying(false); stopTick(); }
      };
      if (!ready) initYouTube(apply); else apply();
    }
  };

  updateUI();
  setStatus("Loading player…");
  initYouTube();
})();
