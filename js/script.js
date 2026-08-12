/* =========================================================
   MOOD: JAZZ (GAURI) — script.js
   Real playback wired to the playlist in playlists.js.
   Play/Pause, Next/Prev, live progress + time, auto-advance,
   cover art / track info sync, and synced lyrics panel.
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

   const dotsMenu         = document.getElementById('dotsMenu');
   const lyricsMenuBtn    = document.getElementById('lyricsMenuBtn');
   const lyricsPanel      = document.getElementById('lyricsPanel');
   const lyricsCloseBtn   = document.getElementById('lyricsCloseBtn');
   const lyricsContent    = document.getElementById('lyricsContent');
   const lyricsTrackInfo  = document.getElementById('lyricsTrackInfo');
   
   const audio = new Audio();
   
   let currentPlaylistName = Object.keys(playlists)[0];
   let currentTrack = playlists[currentPlaylistName];
   let currentIndex = 0;
   let isPlaying = false;
   let isLyricsOpen = false;
   let isDotsMenuOpen = false;
   let currentLyrics = [];
   let activeLyricIndex = -1;
   
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

     loadLyrics(track);
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
     updateLyricsSync(audio.currentTime);
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
   
   dotsBtn.addEventListener('click', (e) => {
     e.stopPropagation();
     toggleDotsMenu();
   });

   lyricsMenuBtn.addEventListener('click', () => {
     closeDotsMenu();
     toggleLyricsPanel();
   });

   lyricsCloseBtn.addEventListener('click', () => {
     closeLyricsPanel();
   });

   document.addEventListener('click', () => {
     closeDotsMenu();
   });

   // =========================================================
   // LYRICS
   // =========================================================

   function parseLRC(text) {
     const lines = [];
     const pattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/;

     text.split('\n').forEach((rawLine) => {
       const match = rawLine.trim().match(pattern);
       if (!match) return;

       const minutes = parseInt(match[1], 10);
       const seconds = parseInt(match[2], 10);
       const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
       const time = minutes * 60 + seconds + ms / 1000;

       lines.push({ time, text: match[4].trim() });
     });

     return lines.sort((a, b) => a.time - b.time);
   }

   async function fetchLyricsFromFile(src) {
     try {
       const response = await fetch(src);
       if (!response.ok) return [];
       const text = await response.text();
       return parseLRC(text);
     } catch {
       return [];
     }
   }

   async function loadLyrics(track) {
     currentLyrics = [];
     activeLyricIndex = -1;

     if (track.lyricsSrc) {
      currentLyrics = await fetchLyricsFromFile(track.lyricsSrc);
    } else if (track.lyrics) {
      currentLyrics = track.lyrics;
    }

     renderLyrics(track);
   }

   function renderLyrics(track) {
     lyricsTrackInfo.innerHTML = `
       <div class="lyrics-track-title">${track.title}</div>
       <div class="lyrics-track-artist">${track.artist}</div>
     `;

     if (!currentLyrics.length) {
       lyricsContent.innerHTML =
         '<p class="lyrics-empty">No lyrics available for this track.</p>';
       return;
     }

     lyricsContent.innerHTML = '';

     currentLyrics.forEach((line, index) => {
       if (!line.text) {
         const spacer = document.createElement('div');
         spacer.className = 'lyrics-line-spacer';
         lyricsContent.appendChild(spacer);
         return;
       }

       const el = document.createElement('div');
       el.className = 'lyrics-line';
       el.dataset.index = index;
       el.textContent = line.text;

       el.addEventListener('click', () => {
         if (!audio.duration) return;
         audio.currentTime = line.time;
         if (!isPlaying) playAudio();
       });

       lyricsContent.appendChild(el);
     });
   }

   function updateLyricsSync(currentTime) {
     if (!isLyricsOpen || !currentLyrics.length) return;

     let newIndex = -1;

     for (let i = currentLyrics.length - 1; i >= 0; i--) {
       if (currentLyrics[i].text && currentTime >= currentLyrics[i].time) {
         newIndex = i;
         break;
       }
     }

     if (newIndex === activeLyricIndex) return;

     if (activeLyricIndex >= 0) {
       const prevLine = lyricsContent.querySelector(`[data-index="${activeLyricIndex}"]`);
       if (prevLine) {
         prevLine.classList.remove('active');
         prevLine.classList.add('past');
       }
     }

     activeLyricIndex = newIndex;

     if (newIndex < 0) return;

     const activeLine = lyricsContent.querySelector(`[data-index="${newIndex}"]`);
     if (!activeLine) return;

     activeLine.classList.add('active');
     activeLine.classList.remove('past');

     lyricsContent.querySelectorAll('.lyrics-line').forEach((el) => {
       const idx = parseInt(el.dataset.index, 10);
       if (idx < newIndex) el.classList.add('past');
       else if (idx > newIndex) el.classList.remove('past', 'active');
     });

     activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
   }

   function toggleLyricsPanel() {
     isLyricsOpen ? closeLyricsPanel() : openLyricsPanel();
   }

   function openLyricsPanel() {
     isLyricsOpen = true;
     lyricsPanel.classList.add('open');
     lyricsPanel.setAttribute('aria-hidden', 'false');
     lyricsMenuBtn.classList.add('active');
     updateLyricsSync(audio.currentTime || 0);
   }

   function closeLyricsPanel() {
     isLyricsOpen = false;
     lyricsPanel.classList.remove('open');
     lyricsPanel.setAttribute('aria-hidden', 'true');
     lyricsMenuBtn.classList.remove('active');
   }

   function toggleDotsMenu() {
     isDotsMenuOpen ? closeDotsMenu() : openDotsMenu();
   }

   function openDotsMenu() {
     isDotsMenuOpen = true;
     dotsMenu.classList.add('open');
     dotsMenu.setAttribute('aria-hidden', 'false');
     dotsBtn.setAttribute('aria-expanded', 'true');
   }

   function closeDotsMenu() {
     isDotsMenuOpen = false;
     dotsMenu.classList.remove('open');
     dotsMenu.setAttribute('aria-hidden', 'true');
     dotsBtn.setAttribute('aria-expanded', 'false');
   }
   
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