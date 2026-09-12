/* =========================================================
   MOOD: JAZZ (GAURI) — script.js
   Real playback wired to the playlist in playlists.js.
   Play/Pause, Next/Prev, live progress + time, auto-advance,
   cover art / track info sync, and synced lyrics panel.
   ========================================================= */

const albumCoverButton = document.getElementById('albumCoverButton');
const playlistPanel = document.getElementById('playlistPanel');
const playlistSongs = document.getElementById('playlistSongs');
const playlistName = document.getElementById('playlistName');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dotsBtn = document.getElementById('dotsBtn');
const progressTrack = document.getElementById('progressTrack');
const progressFill = document.getElementById('progressFill');
const timeElapsedEl = document.getElementById('timeElapsed');
const timeTotalEl = document.getElementById('timeTotal');
const trackTitleEl = document.getElementById('trackTitle');
const trackArtistEl = document.getElementById('trackArtist');
const nowPlayingLabel = document.getElementById('nowPlayingLabel');
const coverArtSmallImg = document.querySelector('#coverArtSmall img');
const coverOverlay = document.getElementById('coverOverlay');
const coverOverlayImage = document.getElementById('coverOverlayImage');
const coverOverlayImg = document.querySelector('#coverOverlayImage img');
const dotsMenu = document.getElementById('dotsMenu');
const lyricsMenuBtn = document.getElementById('lyricsMenuBtn');
const lyricsPanel = document.getElementById('lyricsPanel');
const lyricsCloseBtn = document.getElementById('lyricsCloseBtn');
const lyricsContent = document.getElementById('lyricsContent');
const lyricsTrackInfo = document.getElementById('lyricsTrackInfo');

const audio = new Audio();

let currentPlaylistName = Object.keys(playlists)[0];
let currentTrack = playlists[currentPlaylistName];
let currentIndex = 0;
let isPlaying = false;
let isLyricsOpen = false;
let isDotsMenuOpen = false;
let isCoverOpen = false;
let currentLyrics = [];
let activeLyricIndex = -1;

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─────────────────────────────────────────────────────
// TRACK LOADING
// ─────────────────────────────────────────────────────

function loadTrack(index, autoplay = false) {
  currentIndex = index;
  const track = currentTrack[currentIndex];

  trackTitleEl.textContent = track.title;
  trackArtistEl.textContent = track.artist;
  coverArtSmallImg.src = track.cover;
  coverOverlayImg.src = track.cover;
  nowPlayingLabel.textContent = `${currentPlaylistName} — track ${currentIndex + 1} of ${currentTrack.length}`;

  progressFill.style.width = '0%';
  timeElapsedEl.textContent = '0:00';
  timeTotalEl.textContent = '0:00';

  if (track.src) {
    audio.src = track.src;
  }

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
  loadTrack(wrapped, autoplay);
  if (autoplay) {
    playAudio();
  }
}

playBtn.addEventListener('click', () => {
  if (!currentTrack[currentIndex]) loadTrack(0);
  isPlaying ? pauseAudio() : playAudio();
});

prevBtn.addEventListener('click', () => goToTrack(currentIndex - 1, isPlaying));
nextBtn.addEventListener('click', () => goToTrack(currentIndex + 1, isPlaying));

// ─────────────────────────────────────────────────────
// AUDIO EVENTS
// ─────────────────────────────────────────────────────

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
  const rect = progressTrack.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  if (!audio.duration) return;
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
  // Standard LRC timestamp: [mm:ss.xx] or [mm:ss.xxx]
  const timePattern = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/;
  // LRC metadata tag pattern: [ti:...], [ar:...], [al:...], [by:...], [offset:...]
  // These use letters not digits as the tag key — we skip them entirely.
  const metaPattern = /^\[[a-zA-Z]+:/;

  text.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    // Skip metadata header tags
    if (metaPattern.test(line)) return;

    const match = line.match(timePattern);
    if (!match) return;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
    const time = minutes * 60 + seconds + ms / 1000;
    const text = match[4].trim();

    // Skip lines whose text is only non-ASCII metadata (e.g. 作词, 作曲)
    // These appear in Chinese-sourced LRC files as filler credit lines.
    // We detect them by checking if the text has NO basic Latin letters at all.
    if (text && /^[^\x00-\x7F\s]+\s*:/.test(text)) return;

    lines.push({ time, text });
  });

  return lines.sort((a, b) => a.time - b.time);
}

async function fetchLyricsFromFile(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) return [];
    let text = await response.text();
    // Strip UTF-8 BOM if present (some LRC files start with \uFEFF)
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    return parseLRC(text);
  } catch {
    return [];
  }
}

async function loadLyrics(track) {
  currentLyrics = [];
  activeLyricIndex = -1;

  if (track.lyricsText) {
    // Lyrics are inlined directly — no fetch needed, works with file:// too
    currentLyrics = parseLRC(track.lyricsText);
  } else if (track.lyricsSrc) {
    // Fallback: fetch from file (requires a local server / http://)
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

// =========================================================
// EXPANDED SONG COVER OVERLAY
// =========================================================

function openCoverOverlay() {
  isCoverOpen = true;
  coverOverlay.classList.add('open');
  coverOverlay.setAttribute('aria-hidden', 'false');
}

function closeCoverOverlay() {
  isCoverOpen = false;
  coverOverlay.classList.remove('open');
  coverOverlay.setAttribute('aria-hidden', 'true');
}

function toggleCoverOverlay() {
  isCoverOpen ? closeCoverOverlay() : openCoverOverlay();
}

// Clicking the small song cover in the playbar expands it.
document.getElementById('coverArtSmall').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleCoverOverlay();
});

// Clicking the expanded large cover again closes it.
coverOverlayImage.addEventListener('click', () => {
  closeCoverOverlay();
});

// Pressing ESC also closes the expanded cover.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isCoverOpen) {
    closeCoverOverlay();
  }
});

// =========================================================
// KEYBOARD SHORTCUTS
// =========================================================

document.addEventListener('keydown', (e) => {
  // Ignore shortcuts when typing in an input/textarea or
  // when a modifier key is held (so browser shortcuts still work).
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) {
    return;
  }

  // Spacebar — play / pause
  if (e.code === 'Space') {
    e.preventDefault(); // stop the page from scrolling
    if (!currentTrack[currentIndex]) loadTrack(0);
    isPlaying ? pauseAudio() : playAudio();
    return;
  }

  // Right arrow — seek forward 5 seconds
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    seekBy(5);
    return;
  }

  // Left arrow — seek back 5 seconds, or previous song if
  // the track is less than 5 seconds in.
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const currentTime = audio.currentTime || 0;
    if (currentTime < 5) {
      goToTrack(currentIndex - 1, isPlaying);
    } else {
      seekBy(-5);
    }
    return;
  }
});

// Seek the current track by a relative number of seconds.
function seekBy(seconds) {
  if (!audio.duration) return;
  audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration);
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
  playlistName.textContent = currentPlaylistName;

  currentTrack.forEach((track, index) => {
    const songButton = document.createElement('button');
    songButton.className = 'playlist-song';

    songButton.innerHTML = `
      <span class="playlist-number">${String(index + 1).padStart(2, '0')}</span>
      <img class="playlist-song-cover" src="${track.cover}" alt="">
      <span class="playlist-song-info">
        <span class="playlist-song-title">${track.title}</span>
        <span class="playlist-song-artist">${track.artist}</span>
      </span>
    `;

    songButton.addEventListener('click', () => {
      loadTrack(index, true);
      playAudio();
    });

    playlistSongs.appendChild(songButton);
  });
}

// =========================================================
// OPEN / CLOSE PLAYLIST
// =========================================================

albumCoverButton.addEventListener('click', () => {
  renderPlaylist();
  playlistPanel.classList.toggle('open');
});