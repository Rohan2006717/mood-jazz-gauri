/* =========================================================
   MOOD: JAZZ (GAURI) — script.js
   Real playback wired to the playlist in playlists.js.
   Play/Pause, Next/Prev, live progress + time, auto-advance,
   and cover art / track info sync on every track change.
   The ⋮ playlist-switcher menu itself is still Step 5.
   ========================================================= */
   const albumCoverButton =
   document.getElementById('albumCoverButton');
   
   const playlistPanel =
   document.getElementById('playlistPanel');
   
   const playlistSongs =
   document.getElementById('playlistSongs');
   
   const playlistName =
   document.getElementById('playlistName');
   const playBtn        = document.getElementById('playBtn');
   const prevBtn         = document.getElementById('prevBtn');
   const nextBtn         = document.getElementById('nextBtn');
   const dotsBtn          = document.getElementById('dotsBtn');
   const progressTrack    = document.getElementById('progressTrack');
   const progressFill     = document.getElementById('progressFill');
   const timeElapsedEl    = document.getElementById('timeElapsed');
   const timeTotalEl      = document.getElementById('timeTotal');
   const trackTitleEl     = document.getElementById('trackTitle');
   const trackArtistEl    = document.getElementById('trackArtist');
   const nowPlayingLabel  = document.getElementById('nowPlayingLabel');
   const coverArtSmallImg = document.querySelector('#coverArtSmall img');
   
   const audio = new Audio();
   
   let currentPlaylistName = Object.keys(playlists)[0];
   let currentTrack = playlists[currentPlaylistName];
   let currentIndex = 0;
   let isPlaying = false;
   
   function formatTime(seconds) {
     if (!isFinite(seconds) || seconds < 0) return '0:00';
     const m = Math.floor(seconds / 60);
     const s = Math.floor(seconds % 60).toString().padStart(2, '0');
     return `${m}:${s}`;
   }
   
   function loadTrack(index) {
     currentIndex = index;
     const track = currentTrack[currentIndex];
   
     audio.src = track.src;
     trackTitleEl.textContent = track.title;
     trackArtistEl.textContent = track.artist;
     coverArtSmallImg.src = track.cover;
     nowPlayingLabel.textContent = `${currentPlaylistName} — track ${currentIndex + 1} of ${currentTrack.length}`;
   
     progressFill.style.width = '0%';
     timeElapsedEl.textContent = '0:00';
     timeTotalEl.textContent = '0:00';
   }
   
   function playAudio() {
     audio.play();
     isPlaying = true;
     playBtn.textContent = '⏸';
     playBtn.setAttribute('aria-label', 'Pause');
   }
   
   function pauseAudio() {
     audio.pause();
     isPlaying = false;
     playBtn.textContent = '▶';
     playBtn.setAttribute('aria-label', 'Play');
   }
   
   function goToTrack(index, autoplay) {
     const wrapped = (index + currentTrack.length) % currentTrack.length;
     loadTrack(wrapped);
     if (autoplay) playAudio();
   }
   
   playBtn.addEventListener('click', () => {
     if (!audio.src) loadTrack(0);
     isPlaying ? pauseAudio() : playAudio();
   });
   
   prevBtn.addEventListener('click', () => goToTrack(currentIndex - 1, isPlaying));
   nextBtn.addEventListener('click', () => goToTrack(currentIndex + 1, isPlaying));
   
   audio.addEventListener('timeupdate', () => {
     if (!audio.duration) return;
     progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
     timeElapsedEl.textContent = formatTime(audio.currentTime);
   });
   
   audio.addEventListener('loadedmetadata', () => {
     timeTotalEl.textContent = formatTime(audio.duration);
   });
   
   audio.addEventListener('ended', () => goToTrack(currentIndex + 1, true));
   
   progressTrack.addEventListener('click', (e) => {
     if (!audio.duration) return;
     const rect = progressTrack.getBoundingClientRect();
     const ratio = (e.clientX - rect.left) / rect.width;
     audio.currentTime = ratio * audio.duration;
   });
   
   dotsBtn.addEventListener('click', () => {
     console.log('Playlist options menu — built in Step 5.');
   });
   
   // Load the first track on page load so the UI shows real info immediately.
   loadTrack(0);
   // =========================================================
// INDIA CLOCK
// =========================================================

const clockHours = document.getElementById('clockHours');
const clockMinutes = document.getElementById('clockMinutes');

function updateIndiaClock() {
    const now = new Date();

    const parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(now);

    const getPart = (type) =>
        parts.find(part => part.type === type)?.value || '00';

    clockHours.textContent = getPart('hour');
    clockMinutes.textContent = getPart('minute');
}

updateIndiaClock();
setInterval(updateIndiaClock, 1000);
// =========================================================
// PLAYLIST
// =========================================================

function renderPlaylist() {

  playlistSongs.innerHTML = '';

  playlistName.textContent =
      currentPlaylistName;

  currentTrack.forEach((track, index) => {

      const songButton =
          document.createElement('button');

      songButton.className =
          'playlist-song';

      songButton.innerHTML = `

          <span class="playlist-number">
              ${String(index + 1).padStart(2, '0')}
          </span>

          <img
              class="playlist-song-cover"
              src="${track.cover}"
              alt=""
          >

          <span class="playlist-song-info">

              <span class="playlist-song-title">
                  ${track.title}
              </span>

              <span class="playlist-song-artist">
                  ${track.artist}
              </span>

          </span>
      `;

      songButton.addEventListener(
          'click',
          () => {

              loadTrack(index);

              playAudio();

          }
      );

      playlistSongs.appendChild(
          songButton
      );

  });
}


// =========================================================
// OPEN / CLOSE PLAYLIST
// =========================================================

albumCoverButton.addEventListener(
  'click',
  () => {

      renderPlaylist();

      playlistPanel.classList.toggle('open');

  }
);