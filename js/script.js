/* =========================================================
   MOOD: JAZZ (GAURI) — script.js
   Real playback wired to the playlist in playlists.js.
   Play/Pause, Next/Prev, live progress + time, auto-advance,
   cover art / track info sync, and synced lyrics panel.

   ─────────────────────────────────────────────────────────
   YOUTUBE INTEGRATION
   ─────────────────────────────────────────────────────────
   Tracks with a non-empty `youtubeIds` array (or a legacy
   `youtubeId` string) play through the official YouTube
   IFrame Player API. Candidates are tried in order — if a
   video is not embeddable (error 101/150), unavailable
   (100), or invalid (2), the player automatically tries the
   next candidate. If every candidate fails, a clean message
   with a legitimate "Watch on YouTube" link is shown.

   Tracks without any YouTube ID fall back to the local
   `src` MP3 file for backward compatibility.
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

   const coverOverlay          = document.getElementById('coverOverlay');
   const coverOverlayImage     = document.getElementById('coverOverlayImage');
   const coverOverlayImg       = document.querySelector('#coverOverlayImage img');

   const dotsMenu         = document.getElementById('dotsMenu');
   const lyricsMenuBtn    = document.getElementById('lyricsMenuBtn');
   const lyricsPanel      = document.getElementById('lyricsPanel');
   const lyricsCloseBtn   = document.getElementById('lyricsCloseBtn');
   const lyricsContent    = document.getElementById('lyricsContent');
   const lyricsTrackInfo  = document.getElementById('lyricsTrackInfo');

   // Local audio element — used as fallback for tracks
   // without a youtubeId (backward compatibility).
   const audio = new Audio();

   // ─────────────────────────────────────────────────────
   // YOUTUBE PLAYER STATE
   // ─────────────────────────────────────────────────────
   let ytPlayer = null;
   let ytPlayerReady = false;
   let isYouTubeTrack = false;
   let progressInterval = null;

   // Candidate fallback state — the current track's ordered
   // list of YouTube video IDs and which one we are trying.
   let ytCandidateList = [];
   let ytCandidateIndex = 0;
   let ytAllCandidatesFailed = false;

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
   // YOUTUBE CANDIDATE HELPERS
   // ─────────────────────────────────────────────────────

   // Returns the ordered list of YouTube video IDs for a track.
   // Supports the new `youtubeIds` array and the legacy
   // `youtubeId` string (treated as a single-entry list).
   function getYouTubeIds(track) {
     if (Array.isArray(track.youtubeIds)) {
       return track.youtubeIds.filter((id) => id && id.trim() !== '');
     }
     if (track.youtubeId && track.youtubeId.trim() !== '') {
       return [track.youtubeId.trim()];
     }
     return [];
   }

   function getCurrentYouTubeId() {
     return ytCandidateList[ytCandidateIndex] || null;
   }

   function showYouTubeFallback(track) {
     const fallback = document.getElementById('youtubeFallback');
     const link = document.getElementById('youtubeFallbackLink');
     if (!fallback || !link) return;

     // Point "Watch on YouTube" at the first (preferred) candidate
     // so the user opens the exact recording they selected.
     const preferredId =
       (track.youtubeIds && track.youtubeIds[0]) ||
       track.youtubeId ||
       getCurrentYouTubeId() ||
       '';
     link.href = `https://www.youtube.com/watch?v=${preferredId}`;
     fallback.hidden = false;
   }

   function hideYouTubeFallback() {
     const fallback = document.getElementById('youtubeFallback');
     if (fallback) fallback.hidden = true;
   }

   // Advance to the next candidate. If none remain, show the
   // clean "not available for embedded playback" message.
   function tryNextYouTubeCandidate() {
     ytCandidateIndex++;

     if (ytCandidateIndex < ytCandidateList.length) {
       const nextId = ytCandidateList[ytCandidateIndex];
       console.warn('[YouTube] trying next candidate:', nextId);
       if (isPlaying) {
         ytPlayer.loadVideoById(nextId);
       } else {
         ytPlayer.cueVideoById(nextId);
       }
       return;
     }

     // Every candidate failed — show the fallback message.
     ytAllCandidatesFailed = true;
     isYouTubeTrack = false;
     stopProgressInterval();
     isPlaying = false;
     playBtn.textContent = '▶';
     playBtn.setAttribute('aria-label', 'Play');
     showYouTubeFallback(currentTrack[currentIndex]);
   }

   // ─────────────────────────────────────────────────────
   // YOUTUBE IFrame PLAYER API
   // ─────────────────────────────────────────────────────

   function loadYouTubeAPI() {
     // If the API is already present, create the player directly.
     if (window.YT && window.YT.Player) {
       createYouTubePlayer();
       return;
     }

     // Otherwise inject the official API script.
     const tag = document.createElement('script');
     tag.src = 'https://www.youtube.com/iframe_api';
     const firstScriptTag = document.getElementsByTagName('script')[0];
     firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
   }

   // Called by the YouTube IFrame API once it is ready.
   window.onYouTubeIframeAPIReady = function () {
     createYouTubePlayer();
   };

   function createYouTubePlayer() {
     // `origin` must match the page's actual origin so YouTube
     // can validate the embedding page. For file:// pages there
     // is no real origin, so we omit it (YouTube falls back to
     // the Referer header).
     const playerVars = {
       controls: 0,
       modestbranding: 1,
       rel: 0,
       playsinline: 1
     };
     if (window.location.protocol !== 'file:') {
       playerVars.origin = window.location.origin;
     }

     ytPlayer = new YT.Player('youtubePlayer', {
       height: '113',
       width: '200',
       playerVars,
       events: {
         onReady: onYouTubePlayerReady,
         onStateChange: onYouTubeStateChange,
         onError: onYouTubeError
       }
     });
   }

   function onYouTubePlayerReady(event) {
     ytPlayerReady = true;
     // If the current track has YouTube candidates, re-load it
     // through YouTube now that the API is ready (the initial
     // loadTrack ran before the API finished loading).
     const track = currentTrack[currentIndex];
     if (track && getYouTubeIds(track).length > 0) {
       loadTrack(currentIndex, isPlaying);
     }
   }

   function onYouTubeStateChange(event) {
     if (event.data === YT.PlayerState.PLAYING) {
       // A candidate worked — clear any fallback state.
       ytAllCandidatesFailed = false;
       hideYouTubeFallback();
       isPlaying = true;
       playBtn.textContent = '⏸';
       playBtn.setAttribute('aria-label', 'Pause');
       startProgressInterval();
     } else if (event.data === YT.PlayerState.PAUSED) {
       isPlaying = false;
       playBtn.textContent = '▶';
       playBtn.setAttribute('aria-label', 'Play');
       stopProgressInterval();
     } else if (event.data === YT.PlayerState.ENDED) {
       stopProgressInterval();
       goToTrack(currentIndex + 1, true);
     }
   }

   function onYouTubeError(event) {
     const code = event.data;
     console.warn('[YouTube] error code:', code);

     switch (code) {
       case 101:
       case 150:
         // Embedding disabled by the video owner — try the next
         // candidate. We do NOT attempt to bypass the restriction.
         console.warn('[YouTube] embedding disabled for this video, trying next candidate.');
         tryNextYouTubeCandidate();
         break;

       case 100:
         // Video not found / private — try the next candidate.
         console.warn('[YouTube] video unavailable/private, trying next candidate.');
         tryNextYouTubeCandidate();
         break;

       case 2:
         // Invalid video ID / parameter — try the next candidate.
         console.warn('[YouTube] invalid video ID, trying next candidate.');
         tryNextYouTubeCandidate();
         break;

       case 5:
         // HTML5 player playback error — try the next candidate.
         console.warn('[YouTube] HTML5 player error, trying next candidate.');
         tryNextYouTubeCandidate();
         break;

       case 153:
         // Missing HTTP Referer / API client identification.
         // Check the iframe origin and the page's Referrer-Policy.
         console.error(
           '[YouTube] error 153: missing HTTP Referer or API client ' +
           'identification. Verify the page origin and Referrer-Policy.'
         );
         tryNextYouTubeCandidate();
         break;

       default:
         // Unknown playback error — try the next candidate.
         console.warn('[YouTube] unknown playback error, trying next candidate.');
         tryNextYouTubeCandidate();
         break;
     }
   }

   function startProgressInterval() {
     stopProgressInterval();
     progressInterval = setInterval(updateYouTubeProgress, 250);
   }

   function stopProgressInterval() {
     if (progressInterval) {
       clearInterval(progressInterval);
       progressInterval = null;
     }
   }

   function updateYouTubeProgress() {
     if (!ytPlayer || !ytPlayerReady || !isYouTubeTrack) return;

     const duration = ytPlayer.getDuration();
     const currentTime = ytPlayer.getCurrentTime();

     if (duration > 0) {
       progressFill.style.width = `${(currentTime / duration) * 100}%`;
       timeElapsedEl.textContent = formatTime(currentTime);
       timeTotalEl.textContent = formatTime(duration);
       updateLyricsSync(currentTime);
     }
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

     // Reset the candidate chain for the newly selected track.
     ytCandidateList = getYouTubeIds(track);
     ytCandidateIndex = 0;
     ytAllCandidatesFailed = false;
     hideYouTubeFallback();

     const hasYouTube = ytCandidateList.length > 0;

     if (hasYouTube && ytPlayerReady) {
       isYouTubeTrack = true;
       stopProgressInterval();
       // Pause any local audio playing before switching to YouTube.
       audio.pause();
       if (autoplay) {
         ytPlayer.loadVideoById(ytCandidateList[0]);
       } else {
         ytPlayer.cueVideoById(ytCandidateList[0]);
       }
     } else {
       isYouTubeTrack = false;
       stopProgressInterval();
       // Stop any YouTube playback before switching to local audio.
       if (ytPlayerReady && ytPlayer) {
         ytPlayer.pauseVideo();
       }
       if (track.src) {
         audio.src = track.src;
       }
     }

     loadLyrics(track);
   }

   function playAudio() {
     // If every YouTube candidate failed, don't try to play a
     // silent audio element — just keep the fallback message up.
     if (ytAllCandidatesFailed) {
       showYouTubeFallback(currentTrack[currentIndex]);
       return;
     }

     if (isYouTubeTrack && ytPlayerReady) {
       ytPlayer.playVideo();
     } else {
       audio.play();
     }
     isPlaying = true;
     playBtn.textContent = '⏸';
     playBtn.setAttribute('aria-label', 'Pause');
   }

   function pauseAudio() {
     if (isYouTubeTrack && ytPlayerReady) {
       ytPlayer.pauseVideo();
     } else {
       audio.pause();
     }
     isPlaying = false;
     playBtn.textContent = '▶';
     playBtn.setAttribute('aria-label', 'Play');
   }

   function goToTrack(index, autoplay) {
     const wrapped = (index + currentTrack.length) % currentTrack.length;
     loadTrack(wrapped, autoplay);
     if (autoplay && !isYouTubeTrack) {
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
   // LOCAL AUDIO EVENTS (fallback only)
   // ─────────────────────────────────────────────────────

   audio.addEventListener('timeupdate', () => {
     if (isYouTubeTrack) return;
     if (!audio.duration) return;
     progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
     timeElapsedEl.textContent = formatTime(audio.currentTime);
     updateLyricsSync(audio.currentTime);
   });

   audio.addEventListener('loadedmetadata', () => {
     if (isYouTubeTrack) return;
     timeTotalEl.textContent = formatTime(audio.duration);
   });

   audio.addEventListener('ended', () => goToTrack(currentIndex + 1, true));

   progressTrack.addEventListener('click', (e) => {
     const rect = progressTrack.getBoundingClientRect();
     const ratio = (e.clientX - rect.left) / rect.width;

     if (isYouTubeTrack && ytPlayerReady) {
       const duration = ytPlayer.getDuration();
       if (!duration) return;
       ytPlayer.seekTo(ratio * duration, true);
     } else {
       if (!audio.duration) return;
       audio.currentTime = ratio * audio.duration;
     }
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

     text.split('\n').forEach((raw) => {
       const match = raw.trim().match(pattern);
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
         if (isYouTubeTrack && ytPlayerReady) {
           ytPlayer.seekTo(line.time, true);
         } else {
           if (!audio.duration) return;
           audio.currentTime = line.time;
         }
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
     const currentTime = isYouTubeTrack && ytPlayerReady
       ? ytPlayer.getCurrentTime()
       : (audio.currentTime || 0);
     updateLyricsSync(currentTime);
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

                 loadTrack(index, true);

                 if (!isYouTubeTrack && !ytAllCandidatesFailed) playAudio();

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

   // =========================================================
   // INIT — load the YouTube IFrame API
   // =========================================================

   loadYouTubeAPI();