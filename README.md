# 🎷 Mood: Jazz (Gauri)

A vintage-inspired interactive music player designed around the mood and aesthetic of **Jazz (Gauri)**.

The website provides a complete music-listening experience with a curated playlist, album artwork, synchronized lyrics, playback controls, and a minimal glassmorphism-inspired interface.

## 🌐 Live Demo

**[Mood: Jazz (Gauri)](https://mood-jazz-gauri.vercel.app/)**

## 📂 Repository

**[GitHub Repository](https://github.com/Rohan2006717/mood-jazz-gauri)**

---

## ✨ Features

### 🎵 Music Player

* Play and pause tracks
* Previous and next track controls
* Automatic transition to the next song
* Real-time playback progress
* Current time and total duration display
* Clickable progress bar for seeking
* Current song title and artist display

### 📜 Playlist

* Curated **Mood: Jazz (Gauri)** playlist
* Album artwork for individual tracks
* Click the main album cover to open the playlist
* Tracks are dynamically generated using JavaScript
* Playlist data is separated from player logic for easier maintenance

### 🎤 Synchronized Lyrics

* Dedicated lyrics panel
* Supports `.lrc` lyric files
* Lyrics synchronize with the current playback position
* Active lyric line highlighting
* Lyrics can be opened and closed through the player menu

### 🖼️ Album Artwork

* Dynamic album artwork based on the currently playing track
* Expanded album-cover view
* Artwork synchronization between playlist and player

### ▶️ YouTube Integration

* Supports playback through the **YouTube IFrame Player API**
* Handles multiple YouTube video candidates for a track
* Automatically tries another candidate if a video is unavailable or cannot be embedded
* Provides a "Watch on YouTube" fallback when embedded playback is unavailable

### 🕐 Interface

* Live India time display
* Full-screen background artwork
* Glassmorphism-style player interface
* Responsive layout
* Minimal vintage-inspired visual design
* Responsive mobile layout

---

## 🛠️ Technologies Used

* **HTML5** — Page structure and semantic elements
* **CSS3** — Layout, responsive design, animations, glassmorphism effects
* **JavaScript (ES6+)** — Music player logic and dynamic UI
* **HTML5 Audio API** — Local audio playback
* **YouTube IFrame Player API** — YouTube-based playback
* **LRC** — Timestamped lyrics synchronization
* **Google Fonts** — VT323 typography
* **Vercel** — Deployment
* **Git & GitHub** — Version control

---

## 📁 Project Structure

```text
mood-jazz-gauri/
│
├── assets/
│   ├── audio/
│   ├── backgrounds/
│   ├── covers/
│   └── lyrics/
│
├── css/
│   └── style.css
│
├── js/
│   ├── playlists.js
│   └── script.js
│
├── index.html
└── README.md
```

### `index.html`

Contains the main structure of the application, including:

* Album cover
* Playlist panel
* Lyrics panel
* Music player
* Playback controls
* Progress bar
* Player options menu

### `js/playlists.js`

Contains the playlist and track information separately from the player logic.

Each track can contain:

* Title
* Artist
* Audio source
* Cover artwork
* Lyrics file

### `js/script.js`

Handles the core application functionality, including:

* Track loading
* Play/pause
* Previous/next navigation
* Progress tracking
* Audio seeking
* Automatic track advancement
* YouTube playback
* Lyrics loading and synchronization
* Album artwork updates
* Playlist interaction

### `css/style.css`

Controls:

* Overall visual design
* Responsive layout
* Player interface
* Playlist styling
* Lyrics panel
* Animations and transitions
* Glassmorphism effects

---

## 🚀 Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/Rohan2006717/mood-jazz-gauri.git
```

### 2. Navigate into the project

```bash
cd mood-jazz-gauri
```

### 3. Run the project

Since this is a static HTML/CSS/JavaScript project, it can be opened directly through `index.html`.

For the best development experience, use a local server such as **VS Code Live Server**.

---

## 🎧 Adding a New Track

To add a new song:

1. Add the audio file inside:

```text
assets/audio/
```

2. Add the album artwork inside:

```text
assets/covers/
```

3. Add the lyrics `.lrc` file inside:

```text
assets/lyrics/
```

4. Add the track information to:

```text
js/playlists.js
```

Example:

```javascript
{
    title: "Song Name",
    artist: "Artist Name",
    src: "assets/audio/song.mp3",
    cover: "assets/covers/song.jpg",
    lyricsSrc: "assets/lyrics/song.lrc"
}
```

---

## 🎼 Current Playlist

The current playlist contains a collection of jazz, pop, soul, and vintage-inspired tracks from artists including:

* Elvis Presley
* Madonna
* Stephen Sanchez
* Lesley Gore
* Connie Francis
* Bee Gees
* Paul Anka
* Frank Sinatra
* Frankie Valli
* Michael Bublé
* Dean Martin
* Ella Fitzgerald
* Louis Armstrong
* Etta James
* Billie Holiday
* Edith Piaf
* Eartha Kitt
* And more

---

## 🎯 Project Highlights

This project was built to go beyond a simple static music webpage by implementing an interactive browser-based music player.

Key implementation highlights include:

* Dynamic playlist rendering
* State-based player controls
* Multiple playback sources
* Automatic track advancement
* Real-time progress updates
* Timestamp-based lyric synchronization
* Dynamic album artwork
* YouTube playback fallback handling
* Responsive UI design
* Separation of playlist data from player functionality

---

## 🔮 Future Improvements

Potential improvements for future versions:

* [ ] Volume control
* [ ] Shuffle mode
* [ ] Repeat modes
* [ ] Search within playlist
* [ ] Multiple playlists
* [ ] Keyboard media controls
* [ ] Recently played tracks
* [ ] Favorites system
* [ ] Improved mobile player controls
* [ ] Persistent playback state

---

## 👨‍💻 Author

**Rohan Singh**

B.Tech Mechanical Engineering
Delhi Technological University

### Links

* **GitHub:** [Rohan2006717](https://github.com/Rohan2006717)
* **Live Project:** [Mood: Jazz (Gauri)](https://mood-jazz-gauri.vercel.app/)

---

⭐ If you like the project, consider giving the repository a star!
