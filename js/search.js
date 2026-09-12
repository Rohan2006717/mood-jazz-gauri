/* =========================================================
   DEMOMUSIC — search.js
   Online search via Audius (audio streams) + LRCLIB (lyrics).
   Keeps all existing local-playlist logic in script.js untouched.
   ========================================================= */

// ─────────────────────────────────────────────────────────
// AUDIUS — discovery provider (rotates automatically)
// ─────────────────────────────────────────────────────────

const AUDIUS_BASE = 'https://discoveryprovider.audius.co';
const AUDIUS_APP  = 'DemoMusic';

/**
 * Search Audius for tracks matching `query`.
 * Returns an array of normalised track objects:
 *   { id, title, artist, cover, isOnline: true }
 * The actual stream URL is resolved lazily in playOnlineTrack().
 */
async function searchAudius(query) {
  const url = `${AUDIUS_BASE}/v1/tracks/search?query=${encodeURIComponent(query)}&limit=10&app_name=${AUDIUS_APP}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Audius search failed: ${res.status}`);
  const json = await res.json();

  return (json.data || []).map(track => ({
    id:       track.id,
    title:    track.title,
    artist:   track.user?.name || 'Unknown Artist',
    cover:    track.artwork?.['480x480'] || track.artwork?.['150x150'] || '',
    isOnline: true,
  }));
}

/**
 * Resolve the streamable URL for an Audius track id.
 */
function audiusStreamUrl(trackId) {
  return `${AUDIUS_BASE}/v1/tracks/${trackId}/stream?app_name=${AUDIUS_APP}`;
}

// ─────────────────────────────────────────────────────────
// LRCLIB — synced lyrics
// ─────────────────────────────────────────────────────────

/**
 * Fetch synced (or plain) lyrics from LRCLIB.
 * Returns a parsed LRC array (same format as parseLRC in script.js),
 * or [] if nothing is found.
 */
async function fetchOnlineLyrics(title, artist) {
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const lrc  = json.syncedLyrics || json.plainLyrics || '';
    if (!lrc) return [];
    // syncedLyrics is standard LRC; plainLyrics has no timestamps → wrap each line
    if (json.syncedLyrics) return parseLRC(lrc);
    // Plain lyrics fallback: display as static lines (time = 0 for all)
    return lrc.split('\n').filter(l => l.trim()).map(text => ({ time: 0, text }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// PLAY AN ONLINE TRACK
// ─────────────────────────────────────────────────────────

/**
 * Called when user clicks ▶ on a search result card.
 * Sets up the global `audio` element and player UI exactly
 * the same way loadTrack() does for local songs.
 */
async function playOnlineTrack(track) {
  // Mark as online so script.js knows not to prepend assets/ path
  const streamUrl = audiusStreamUrl(track.id);

  // Update player bar UI (mirrors loadTrack() in script.js)
  trackTitleEl.textContent  = track.title;
  trackArtistEl.textContent = track.artist;
  nowPlayingLabel.textContent = `Online — ${track.title}`;

  // Cover art
  if (track.cover) {
    coverArtSmallImg.src  = track.cover;
    coverOverlayImg.src   = track.cover;
  } else {
    coverArtSmallImg.src  = 'assets/covers/placeholder-cover.svg';
    coverOverlayImg.src   = 'assets/covers/placeholder-cover.svg';
  }

  progressFill.style.width   = '0%';
  timeElapsedEl.textContent  = '0:00';
  timeTotalEl.textContent    = '0:00';

  // Point the audio element at the stream
  audio.src = streamUrl;

  // Reset lyrics state then fetch online lyrics
  currentLyrics    = [];
  activeLyricIndex = -1;
  renderLyrics(track);                       // show "loading lyrics…" immediately
  lyricsContent.innerHTML = '<p class="lyrics-empty">Fetching lyrics…</p>';

  const lyrics = await fetchOnlineLyrics(track.title, track.artist);
  currentLyrics = lyrics;
  renderLyrics(track);

  // Play
  playAudio();

  // Close search panel after starting playback
  closeSearchPanel();
}

// ─────────────────────────────────────────────────────────
// SEARCH PANEL — DOM references
// ─────────────────────────────────────────────────────────

const searchBtn        = document.getElementById('searchBtn');
const searchPanel      = document.getElementById('searchPanel');
const searchInput      = document.getElementById('searchInput');
const searchResults    = document.getElementById('searchResults');
const searchCloseBtn   = document.getElementById('searchCloseBtn');

let isSearchOpen = false;
let searchDebounce = null;

// ─────────────────────────────────────────────────────────
// OPEN / CLOSE
// ─────────────────────────────────────────────────────────

function openSearchPanel() {
  isSearchOpen = true;
  searchPanel.classList.add('open');
  searchPanel.setAttribute('aria-hidden', 'false');
  searchBtn.classList.add('active');
  // Focus input after transition
  setTimeout(() => searchInput.focus(), 150);
}

function closeSearchPanel() {
  isSearchOpen = false;
  searchPanel.classList.remove('open');
  searchPanel.setAttribute('aria-hidden', 'true');
  searchBtn.classList.remove('active');
}

function toggleSearchPanel() {
  isSearchOpen ? closeSearchPanel() : openSearchPanel();
}

// ─────────────────────────────────────────────────────────
// SEARCH LOGIC
// ─────────────────────────────────────────────────────────

function showSearchState(html) {
  searchResults.innerHTML = html;
}

async function runSearch(query) {
  if (!query.trim()) {
    showSearchState('');
    return;
  }

  showSearchState('<p class="search-status">Searching…</p>');

  try {
    const tracks = await searchAudius(query);

    if (!tracks.length) {
      showSearchState('<p class="search-status">No results found on Audius. Try a different query.</p>');
      return;
    }

    searchResults.innerHTML = '';

    tracks.forEach(track => {
      const card = document.createElement('div');
      card.className = 'search-result-card';

      const coverHtml = track.cover
        ? `<img src="${track.cover}" alt="" class="search-card-cover" loading="lazy">`
        : `<div class="search-card-cover search-card-cover--placeholder">♪</div>`;

      card.innerHTML = `
        ${coverHtml}
        <div class="search-card-info">
          <span class="search-card-title">${escHtml(track.title)}</span>
          <span class="search-card-artist">${escHtml(track.artist)}</span>
        </div>
        <button class="search-card-play" aria-label="Play ${escHtml(track.title)}">▶</button>
      `;

      card.querySelector('.search-card-play').addEventListener('click', (e) => {
        e.stopPropagation();
        playOnlineTrack(track);
      });

      // Clicking anywhere on card also plays
      card.addEventListener('click', () => playOnlineTrack(track));

      searchResults.appendChild(card);
    });

  } catch (err) {
    showSearchState('<p class="search-status search-status--error">Could not reach Audius. Check your internet connection.</p>');
    console.error('[search.js] Audius error:', err);
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────────────────

searchBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  // Close dots menu if open
  if (isDotsMenuOpen) closeDotsMenu();
  toggleSearchPanel();
});

searchCloseBtn.addEventListener('click', () => {
  closeSearchPanel();
});

// Debounced live search as user types
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => runSearch(searchInput.value), 420);
});

// Enter key triggers immediate search
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(searchDebounce);
    runSearch(searchInput.value);
  }
  if (e.key === 'Escape') closeSearchPanel();
});

// Close when clicking outside the panel
document.addEventListener('click', (e) => {
  if (isSearchOpen && !searchPanel.contains(e.target) && e.target !== searchBtn) {
    closeSearchPanel();
  }
});
