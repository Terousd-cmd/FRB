// =================================================================
// YOUR LIVE FIREBASE CONFIG (Required for Database)
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyA1CkbaFKLSaqWROOl_Q3b_3gjuJCp3pHs",
  authDomain: "frb-26.firebaseapp.com",
  projectId: "frb-26",
  storageBucket: "frb-26.firebasestorage.app",
  messagingSenderId: "593300775041",
  appId: "1:593300775041:web:0aa92dddedd935c5f6ad80",
  measurementId: "G-D63F9N3HPF"
};

// =================================================================
// APP LOGIC - Handles both index.html and video.html
// =================================================================

document.addEventListener("DOMContentLoaded", () => {

    // --- Determine Current Page ---
    const isIndexPage = document.getElementById('subject-selection-content') !== null;
    const isVideoPage = document.getElementById('video-app-content') !== null && !isIndexPage;

    // --- Initialize Firebase (Required for Firestore) ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth(); // Keep auth for potential future use
    const db = firebase.firestore(); // Firestore database instance

    // --- Get Common DOM Elements ---
    // Note: Some elements only exist on one page, checks needed before use
    const authContainer = document.getElementById('auth-container');
    const subjectSelectionContent = document.getElementById('subject-selection-content');
    const videoAppContent = document.getElementById('video-app-content');
    const loginForm = document.getElementById('login-form');
    const loginMsg = document.getElementById('login-message');
    const logoutBtn = document.getElementById('logout-button');
    const googleLoginBtn = document.getElementById('google-login-button');


    // --- LOGIC FOR INDEX.HTML (Login & Subject Selection) ---
    if (isIndexPage) {
        console.log("Running script for index.html");
        // Subject cards are now links, no JS needed for navigation

        // --- Google Login Logic (Commented out for testing) ---
        /*
        if (googleLoginBtn) {
          googleLoginBtn.addEventListener('click', () => {
             const provider = new firebase.auth.GoogleAuthProvider();
             loginMsg.textContent = 'Opening Google Sign-in...';
             auth.signInWithPopup(provider)
               .then((result) => {
                 const user = result.user;
                 const isNewUser = result.additionalUserInfo.isNewUser;
                 loginMsg.textContent = 'Checking approval...';
                 if (isNewUser) {
                   db.collection('users').doc(user.uid).set({ email: user.email, isApproved: false });
                 }
                 // onAuthStateChanged will handle the rest
               })
               .catch((error) => { loginMsg.style.color = 'var(--live-red)'; loginMsg.textContent = error.message; });
          });
        }
        */

        // --- Central Auth Checker (Commented out for testing) ---
        /*
        auth.onAuthStateChanged((user) => {
            if (user) {
                 db.collection('users').doc(user.uid).get().then(doc => {
                     if (doc.exists && doc.data().isApproved === true) { // Approved user
                         if (authContainer) authContainer.style.display = 'none';
                         if (subjectSelectionContent) subjectSelectionContent.style.display = 'block';
                     } else { // Not approved or doc doesn't exist yet
                         auth.signOut();
                         if (loginMsg) { loginMsg.style.color = 'var(--live-red)'; loginMsg.textContent = 'Account pending approval.'; }
                         // Ensure login form is visible if approval fails
                         if (authContainer) authContainer.style.display = 'block';
                         if (subjectSelectionContent) subjectSelectionContent.style.display = 'none';
                     }
                 }).catch(err => { // Error fetching doc
                      console.error("Auth check error:", err);
                      auth.signOut();
                      if (authContainer) authContainer.style.display = 'block';
                      if (subjectSelectionContent) subjectSelectionContent.style.display = 'none';
                 });
            } else { // No user logged in
                if (authContainer) authContainer.style.display = 'block';
                if (subjectSelectionContent) subjectSelectionContent.style.display = 'none';
            }
        });
        */

        // --- FOR TESTING: Make sure subject selection is visible ---
        if (subjectSelectionContent) subjectSelectionContent.style.display = 'block';
        if (authContainer) authContainer.style.display = 'none';


    } // --- END OF INDEX.HTML LOGIC ---


    // --- LOGIC FOR VIDEO.HTML (Video Player) ---
    else if (isVideoPage) {
        console.log("Running script for video.html");

        // Get Subject ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const subjectId = urlParams.get('subject');
        console.log("Current Subject:", subjectId);

        // --- Fetch Videos from Firestore ---
        if (subjectId) {
            // *** FIXED COLLECTION NAME HERE: Changed 'subjects' to 'subject' ***
            db.collection('subject').doc(subjectId).get()
                .then((doc) => {
                    if (doc.exists) {
                        const subjectData = doc.data();
                        const videos = subjectData.videos || []; // Get videos array or empty array
                        const sidebarTitle = document.getElementById('sidebar-title');
                        if(sidebarTitle && subjectData.subjectName) {
                            // Use subjectName if available, otherwise fallback
                             sidebarTitle.textContent = subjectData.subjectName ? subjectData.subjectName + " Videos" : "Today's Videos";
                        }
                        populateSidebar(videos); // Populate sidebar with fetched videos
                        if (videos.length > 0 && videos[0].videoId) { // Added check for videoId existence
                             // Pass the entire video list to startVideoApp for robust initialization
                             startVideoApp(videos);
                        } else {
                            // Handle case with no videos or missing videoId
                            console.warn("No valid videos found for this subject or first video missing videoId.");
                            handleNoVideosError("No videos available for this subject today.");
                        }
                    } else {
                        console.error("No such subject document in 'subject' collection!");
                         handleNoVideosError("Could not find subject data."); // More specific error
                    }
                })
                .catch((error) => {
                    console.error("Error getting subject document:", error);
                    handleNoVideosError(); // Generic error message
                });
        } else {
            console.error("No subject ID found in URL!");
            handleNoVideosError("Invalid subject link."); // More specific error
        }

        // Updated error handler with optional message
        function handleNoVideosError(message = "Could not load subject videos.") {
             const placeholder = document.getElementById('video-placeholder');
             if(placeholder) placeholder.innerHTML = `<h3 style='color: var(--text-secondary);'>${message}</h3>`;
             const loadingPlaceholder = document.getElementById('loading-videos-placeholder');
             if (loadingPlaceholder) loadingPlaceholder.textContent = "Error loading videos.";
             // Ensure sidebar doesn't just say "Loading..."
             const topicListElement = document.getElementById('topic-list-1');
             if (topicListElement && !topicListElement.hasChildNodes()) { // Only update if empty
                 topicListElement.innerHTML = `<li style="text-align: center; color: var(--text-secondary); padding: 20px;">${message === "Invalid subject link." ? "Invalid subject." : "Error loading videos."}</li>`;
             }
        }


        // --- Function to populate sidebar ---
        function populateSidebar(videoList) {
            const topicListElement = document.getElementById('topic-list-1');
            const loadingPlaceholder = document.getElementById('loading-videos-placeholder'); // Keep reference

            if (!topicListElement) {
                console.error("Sidebar topic list element not found!");
                return;
            }

            topicListElement.innerHTML = ''; // Clear existing items (like "Loading...")

            if (!Array.isArray(videoList) || videoList.length === 0) {
                 topicListElement.innerHTML = '<li style="text-align: center; color: var(--text-secondary); padding: 20px;">No videos found for today.</li>';
                 return;
            }

            videoList.forEach((video, index) => {
                // Validate video data structure
                if (typeof video !== 'object' || !video.videoId || !video.title) {
                    console.warn(`Skipping invalid video data at index ${index}:`, video);
                    return; // Skip this invalid entry
                }

                const li = document.createElement('li');
                li.classList.add('topic-item');
                li.setAttribute('data-video-id', video.videoId);

                const span = document.createElement('span');
                span.textContent = video.title; // Use title directly
                li.appendChild(span);

                topicListElement.appendChild(li);

                // Add active class to the first valid video in the list
                if (index === 0) { // Keep activating the first item for now
                    li.classList.add('active-video');
                }
            });

             // If after iterating, the list is still empty (all items were invalid)
             if (!topicListElement.hasChildNodes()) {
                 topicListElement.innerHTML = '<li style="text-align: center; color: var(--text-secondary); padding: 20px;">Video data is invalid.</li>';
             }
        }


        // --- Logout Logic (Commented out for testing) ---
        /*
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
             auth.signOut().then(() => {
                 window.location.href = 'index.html'; // Redirect to index after logout
             });
          });
        }
        */

        // --- Auth Check for Video Page (Commented out for testing) ---
        /*
        auth.onAuthStateChanged((user) => {
            if (user) {
                 db.collection('users').doc(user.uid).get().then(doc => {
                     if (doc.exists && doc.data().isApproved === true) {
                         // User is approved, continue (video loading already started)
                         if (logoutBtn) style.display = 'block';
                     } else {
                         // Not approved or error, redirect back to index
                         alert("Access denied.");
                         window.location.href = 'index.html';
                     }
                 }).catch(err => {
                      window.location.href = 'index.html';
                 });
            } else {
                // No user logged in, redirect back to index
                window.location.href = 'index.html';
            }
        });
        */

        // --- FOR TESTING: ---
        // Video app start is now triggered by the Firestore fetch success/failure
        // if (logoutBtn) style.display = 'block';


    } // --- END OF VIDEO.HTML LOGIC ---


  // =================================================================
  // VIDEO PLAYER CODE (Common function used by video.html)
  // =================================================================
  // Declare players globally within the DOMContentLoaded scope
  let players = {};
  let clockInterval; // Keep track of the clock interval
  let progressInterval; // Keep track of progress interval

  function startVideoApp(videoList) {
    // Determine the initial video ID from the list
    const initialVideoId = (Array.isArray(videoList) && videoList.length > 0) ? videoList[0].videoId : null;

    if (!initialVideoId) {
        console.error("startVideoApp called without a valid initial video ID.");
        handleNoVideosError("Player initialization failed: No video ID provided.");
        return;
    }

    console.log(`Video app starting with video: ${initialVideoId}`);

    // If player already exists, just load the video and maybe play
    if (players[1] && typeof players[1].loadVideoById === 'function') {
        console.log("Player exists. Loading new initial video.");
        players[1].loadVideoById(initialVideoId);
        if(!readyFlags[1]) { setupControls(1); }
        const placeholder = document.getElementById('video-placeholder');
        if (placeholder) placeholder.classList.add('hidden');
        hasInteracted[1] = true; 
        
        // Ensure correct sidebar item is marked active
        const topicListElement = document.getElementById('topic-list-1');
         if (topicListElement) {
             topicListElement.querySelectorAll('.topic-item').forEach(item => {
                 if (item.getAttribute('data-video-id') === initialVideoId) {
                     item.classList.add('active-video');
                 } else {
                     item.classList.remove('active-video');
                 }
             });
         }
        return;
    }
     // If player object exists but is not fully functional, reset and recreate
     if (players[1]) {
         console.warn("Player object exists but seems invalid. Attempting to destroy and recreate.");
         try { players[1].destroy(); } catch(e) {}
         players = {}; // Reset players object
         playersInitialized = false; // Reset flag
     }


    // --- Define player variables (scoped to startVideoApp) ---
    //let players = {}; // Moved outside function
    let readyFlags = {1: false};
    let hideTimeout = {1: null};
    let hasInteracted = {1: false};
    let isAwaitingNativeClick = {1: false};
    let clickedPlay = {1: false};
    let wakeLock = null;
    // --- End Player Variables ---

    // --- Clock Function ---
    function updateClock() {
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", { hour12: true });
      const date = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const clockEl = document.getElementById("realtime-clock");
      if (clockEl) {
          clockEl.innerHTML = `${date} <span>|</span> ${time}`;
      }
    }
    if (clockInterval) clearInterval(clockInterval); // Clear existing interval first
    clockInterval = setInterval(updateClock, 1000);
    updateClock();

    // --- Wake Lock Functions ---
    const requestWakeLock = async () => { /* ... Wake lock code ... */ };
    const releaseWakeLock = async () => { /* ... Wake lock code ... */ };

    // --- YouTube API Loading ---
    function ensureYouTubeAPI(callback) {
      if (window.YT && YT.Player) {
        callback();
      } else {
         if (!window.ytApiLoaded) {
            window.ytApiLoaded = true;
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            (document.head || document.body).appendChild(tag);
         }
        setTimeout(() => ensureYouTubeAPI(callback), 100);
      }
    }


    let apiReady = false;
    let playersInitialized = false;

    function createPlayers() {
       if (typeof YT === 'undefined' || !YT.Player) {
         setTimeout(createPlayers, 200); return;
       }
      if (!apiReady || playersInitialized) {
         if(!apiReady) { setTimeout(createPlayers, 200); return; }
         if (playersInitialized) return;
      }
      playersInitialized = true;
      console.log("Initializing player...");
      try {
          if (document.getElementById("player1")) {
              players[1] = new YT.Player("player1", {
                height: '100%', width: '100%',
                // VIDEO ID REMOVED FROM HERE, RELYING ON ONREADY
                playerVars: { 'playsinline': 1, 'controls': 0, 'modestbranding': 1, 'showinfo': 0, 'rel': 0 },
                events: {
                  'onReady': (event) => {
                    console.log("Player is Ready! Loading video:", initialVideoId);
                    
                    // *** CRITICAL FIX: Load video explicitly upon player readiness ***
                    // This ensures the video loads right after the player is fully built in the iframe
                    event.target.loadVideoById(initialVideoId); 

                    setupControls(1);
                    const placeholder = document.getElementById('video-placeholder');
                    if (placeholder) placeholder.classList.add('hidden');
                    hasInteracted[1] = true;
                    // event.target.playVideo(); 
                  },
                  'onStateChange': (e) => updatePlayState(e, 1)
                },
              });
          } else { console.error("Player element #player1 not found!"); }
      } catch (e) { console.error("Error creating YT Player:", e); }
    }

    // Define the global callback *once*
    if (!window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = function() {
          console.log("onYouTubeIframeAPIReady called.");
          apiReady = true;
           ensureYouTubeAPI(createPlayers);
        }
    } else {
         if(apiReady && !playersInitialized) ensureYouTubeAPI(createPlayers);
    }

    // --- updatePlayState function ---
    function updatePlayState(event, num) {
      const playIcon = document.querySelector(`.play-pause-btn[data-player="${num}"] i`);
      const controls = document.querySelector(`.custom-controls[data-player="${num}"]`);
      const overlayPlayBtn = document.querySelector(`.overlay-play-btn[data-player="${num}"]`);
      const overlayIcon = overlayPlayBtn ? overlayPlayBtn.querySelector('i') : null;

      // Add safety checks for elements
      if (!playIcon || !controls || !overlayPlayBtn || !overlayIcon) {
          console.warn("One or more control elements missing in updatePlayState");
          return;
      }


      const overlay = document.querySelector(`.video-player-overlay[data-player="${num}"]`);
      const player = players[num];

       if (!player || typeof player.getPlayerState !== 'function') return;


      if (event.data === YT.PlayerState.PLAYING) {
        playIcon.classList.remove("fa-play"); playIcon.classList.add("fa-pause");
        overlayIcon.classList.remove("fa-play"); overlayIcon.classList.add("fa-pause");
        requestWakeLock();
        if (isAwaitingNativeClick[num]) { /* ... takeover logic ... */ }
        if (hasInteracted[num]) { if (clickedPlay[num]) { autoHideControls(num, 2, true); clickedPlay[num] = false; } else { autoHideControls(num, 3000); } }
      } else if (event.data === YT.PlayerState.ENDED) {
        playIcon.classList.remove("fa-pause"); playIcon.classList.add("fa-play");
        overlayIcon.classList.remove("fa-pause"); overlayIcon.classList.add("fa-play");
        overlayPlayBtn.classList.remove("hidden");
        releaseWakeLock();
        try { player.pauseVideo(); player.seekTo(0); } catch (e) {}
      } else {
        playIcon.classList.remove("fa-pause"); playIcon.classList.add("fa-play");
        overlayIcon.classList.remove("fa-pause"); overlayIcon.classList.add("fa-play");
        overlayPlayBtn.classList.remove("hidden");
        releaseWakeLock();
        clearTimeout(hideTimeout[num]);
        // Show controls immediately when paused/buffered if interacted
        if (hasInteracted[num]) {
            controls.classList.add('no-transition');
            if(overlay) { overlay.classList.add('no-transition'); overlay.classList.remove('limbo'); }
            controls.classList.remove('hidden');
            overlayPlayBtn.classList.remove('hidden'); // Ensure play button shows too
            setTimeout(() => {
                controls.classList.remove('no-transition');
                if(overlay) overlay.classList.remove('no-transition');
            }, 50);
        }
      }
    }

    // --- autoHideControls function ---
    function autoHideControls(num, delay = 3000, instant = false) {
      const player = players[num];
      const controls = document.querySelector(`.custom-controls[data-player="${num}"]`);
      const overlayPlayBtn = document.querySelector(`.overlay-play-btn[data-player="${num}"]`);
       if (!player || typeof player.getPlayerState !== 'function' || !controls || !overlayPlayBtn || !hasInteracted[num]) return;
      clearTimeout(hideTimeout[num]);
      try {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
            const overlay = document.querySelector(`.video-player-overlay[data-player="${num}"]`);
            if (instant) {
                controls.classList.add('no-transition');
                if(overlay) { overlay.classList.add('no-transition'); overlay.classList.remove('limbo'); }
            }
            hideTimeout[num] = setTimeout(() => {
                controls.classList.add("hidden");
                overlayPlayBtn.classList.add("hidden");
                if (instant) { setTimeout(() => { controls.classList.remove('no-transition'); if(overlay) overlay.classList.remove('no-transition'); }, 50); }
            }, delay);
        }
      } catch (e) { console.log("Player not ready for auto-hide:", e); }
    }

    // --- setupControls function ---
    function setupControls(num) {
        readyFlags[num] = true;
        const player = players[num];

       if (!player || typeof player.getCurrentTime !== 'function') {
           console.error("Player object not ready in setupControls");
           return;
       }

        const videoPlayerContainer=document.querySelector(`.video-player[data-id="${num}"]`);
        const controls=document.querySelector(`.custom-controls[data-player="${num}"]`);
        const rewindBtn=document.querySelector(`.rewind-btn[data-player="${num}"]`);
        const forwardBtn=document.querySelector(`.forward-btn[data-player="${num}"]`);
        const playBtn=document.querySelector(`.play-pause-btn[data-player="${num}"]`);
        const volumeBtn=document.querySelector(`.volume-btn[data-player="${num}"]`);
        const fullscreenBtn=document.querySelector(`.fullscreen-btn[data-player="${num}"]`);
        const settingsBtn=document.querySelector(`.settings-btn[data-player="${num}"]`);
        const progress=document.querySelector(`.progress-container[data-player="${num}"]`);
        const bar=progress?progress.querySelector(".progress-bar"):null;
        const timeDisplay=document.querySelector(`.time-display[data-player="${num}"]`);
        const speedMenu=document.querySelector(`.speed-menu[data-player="${num}"]`);
        const speedOptions=speedMenu?speedMenu.querySelectorAll(".speed-option") :[];
        const overlayPlayBtn=document.querySelector(`.overlay-play-btn[data-player="${num}"]`);
        const overlay=document.querySelector(`.video-player-overlay[data-player="${num}"]`);
        const liveBtn=document.querySelector(`.live-btn[data-player="${num}"]`);
        const seekTooltip=progress?progress.querySelector(".seek-tooltip"):null;
        const fmt=(s)=>`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,"0")}`;
        let isSeeking=false;

        // --- Attach all event listeners ---
         if(overlayPlayBtn && playBtn) overlayPlayBtn.onclick = (e) => { e.stopPropagation(); if (player.getPlayerState() !== YT.PlayerState.PLAYING) { clickedPlay[num] = true; } playBtn.click(); };
         if (overlay && playBtn) { overlay.onclick = () => { if (!hasInteracted[num]) return; if (player.getPlayerState() !== YT.PlayerState.PLAYING) { clickedPlay[num] = true; } playBtn.click(); }; }
         if(videoPlayerContainer && controls && overlayPlayBtn) videoPlayerContainer.addEventListener("mousemove", () => { if (hasInteracted[num]) { controls.classList.remove('no-transition'); if(overlay) { overlay.classList.remove('no-transition'); overlay.classList.remove('limbo'); } overlayPlayBtn.classList.remove('no-transition'); controls.classList.remove("hidden"); overlayPlayBtn.classList.remove("hidden"); autoHideControls(num, 3000); } });
         if(controls && overlayPlayBtn) controls.addEventListener("mouseenter", () => { clearTimeout(hideTimeout[num]); controls.classList.remove("hidden"); overlayPlayBtn.classList.remove("hidden"); });
         if(controls) controls.addEventListener("mouseleave", () => { if (hasInteracted[num]) { autoHideControls(num, 3000); } });
         if(settingsBtn && controls && speedMenu) settingsBtn.onclick = (e) => { e.stopPropagation(); hasInteracted[num] = true; clearTimeout(hideTimeout[num]); controls.classList.remove("hidden"); speedMenu.style.display = speedMenu.style.display === "block" ? "none" : "block"; };
         if(speedMenu) { document.addEventListener("click", () => { speedMenu.style.display = "none"; if (hasInteracted[num]) { try { if (player.getPlayerState() === YT.PlayerState.PLAYING) { autoHideControls(num, 3000); } } catch (e) {} } }); speedMenu.addEventListener("click", (e) => { e.stopPropagation(); }); }
         if(speedOptions.length > 0 && speedMenu) speedOptions.forEach(option => { option.addEventListener("click", () => { try { const speed = parseFloat(option.getAttribute("data-speed")); player.setPlaybackRate(speed); speedOptions.forEach(opt => opt.classList.remove("current-speed")); option.classList.add("current-speed"); speedMenu.style.display = "none"; if (hasInteracted[num] && player.getPlayerState() === YT.PlayerState.PLAYING) { autoHideControls(num, 3000); } } catch (e) {} }); });
         if(rewindBtn) rewindBtn.onclick = () => { hasInteracted[num] = true; try { const newTime = Math.max(0, player.getCurrentTime() - 10); player.seekTo(newTime, true); } catch (e) {} };
         if(forwardBtn) forwardBtn.onclick = () => { hasInteracted[num] = true; try { const newTime = Math.min(player.getDuration(), player.getCurrentTime() + 10); player.seekTo(newTime, true); } catch (e) {} };
         if(playBtn) playBtn.onclick = () => { hasInteracted[num] = true; try { const state = player.getPlayerState(); if (state === YT.PlayerState.PLAYING) { player.pauseVideo(); } else { clickedPlay[num] = true; player.playVideo(); } } catch (e) { try { clickedPlay[num] = true; player.playVideo(); } catch (err) {} } };
         if(volumeBtn) volumeBtn.onclick = () => { hasInteracted[num] = true; try { const icon = volumeBtn.querySelector("i"); if (player.isMuted()) { player.unMute(); icon.classList.replace("fa-volume-mute", "fa-volume-up"); } else { player.mute(); icon.classList.replace("fa-volume-up", "fa-volume-mute"); } } catch (e) {} };
         if(fullscreenBtn) fullscreenBtn.onclick = () => { hasInteracted[num] = true; try { const container = document.querySelector(`.video-player[data-id="${num}"]`); const icon = fullscreenBtn.querySelector("i"); const exitIcon = "fa-arrows-rotate"; const enterIcon = "fa-compress"; if (!document.fullscreenElement) { if(container) container.requestFullscreen?.(); icon.classList.replace(exitIcon, enterIcon); if (screen.orientation && screen.orientation.lock) { screen.orientation.lock('landscape').catch(err => {}); } } else { document.exitFullscreen?.(); icon.classList.replace(enterIcon, exitIcon); if (screen.orientation && screen.orientation.unlock) { screen.orientation.unlock(); } } } catch (e) {} };
         if(liveBtn) liveBtn.onclick = () => { hasInteracted[num] = true; try { player.seekTo(player.getDuration(), true); } catch (e) {} };


        // --- Sidebar Click Logic ---
        const topicList = document.querySelector(`.topic-list[data-player="${num}"]`);
        const placeholder = document.getElementById('video-placeholder');
        if (topicList) {
            topicList.addEventListener('click', (e) => {
                const topicItem = e.target.closest('.topic-item');
                if (!topicItem) return;
                const videoId = topicItem.getAttribute('data-video-id');
                if (!player || typeof player.loadVideoById !== 'function') { console.error("Player not ready."); return; }
                try {
                    console.log("Loading video from sidebar:", videoId); // Debug log
                    player.loadVideoById({ videoId: videoId, startSeconds: 0 });
                    // Don't auto-play immediately, let user click play or rely on YT state changes
                    // setTimeout(() => { try { player.playVideo(); hasInteracted[num] = true; } catch(e) {} }, 150);

                    topicList.querySelectorAll('.topic-item').forEach(item => item.classList.remove('active-video'));
                    topicItem.classList.add('active-video');
                    if (placeholder) placeholder.classList.add('hidden'); // Ensure placeholder is hidden
                } catch (err) { console.error("Error loading video from sidebar:", err); }
            });
        }

        // --- Progress Bar Update Interval ---
       if (progressInterval) clearInterval(progressInterval);
       progressInterval = setInterval(() => {
             const current_player = players[num];
             if (!readyFlags[num] || isSeeking || !current_player || typeof current_player.getDuration !== 'function' || typeof current_player.getCurrentTime !== 'function') return; // Added getCurrentTime check
             try {
                const dur = current_player.getDuration();
                // Check duration validity more strictly
                if (typeof dur !== 'number' || dur <= 0 || isNaN(dur)) return;
                const cur = current_player.getCurrentTime();
                 // Check current time validity
                 if (typeof cur !== 'number' || isNaN(cur)) return;
                const percent = (cur / dur)* 100;
                if(bar) bar.style.width = percent + "%";
                const videoData = current_player.getVideoData ? current_player.getVideoData() : null;
                if (videoData && videoData.isLive) { /* ... Live logic ... */ }
                else { if(timeDisplay) timeDisplay.textContent = `${fmt(cur)} / ${fmt(dur)}`; if(liveBtn) liveBtn.style.display = 'none'; }
             } catch (e) { /* Less noisy console */ }
          }, 500);

        // --- Seek Tooltip Logic ---
        if(progress && seekTooltip) progress.addEventListener("mousemove", (e) => { /* ... Tooltip logic ... */ });

        // --- Seek Handling Logic ---
        function handleSeek(e) { /* ... Seek logic ... */ }
        if(progress) { // Add listeners only if progress exists
            progress.addEventListener("mousedown", (e) => { isSeeking = true; hasInteracted[num] = true; handleSeek(e); });
            progress.addEventListener("touchstart", (e) => { isSeeking = true; hasInteracted[num] = true; handleSeek(e); });
        }
        // Keep document listeners, but ensure isSeeking logic works
        // Consider adding/removing these listeners dynamically if needed
        document.addEventListener("mousemove", (e) => { if (isSeeking) handleSeek(e); });
        document.addEventListener("mouseup", () => { isSeeking = false; });
        document.addEventListener("touchmove", (e) => { if (isSeeking) handleSeek(e); });
        document.addEventListener("touchend", (e) => { if (isSeeking) handleSeek(e); }); // Fixed touch-end handler

    } // End setupControls

    // --- Start API Loading ---
     ensureYouTubeAPI(() => {
         if (apiReady && !playersInitialized) {
             createPlayers();
         }
     });

    // --- Keyboard/Visibility Listeners ---
     if (!window.keyboardListenerAdded) {
         window.keyboardListenerAdded = true;
         document.addEventListener('keydown', (e) => {
            const player = players[1]; // Get player instance
           const activeEl = document.activeElement; if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
           if (!hasInteracted[1]) return; 
           if (e.key === ' ' || e.keyCode === 32) { e.preventDefault(); const btn = document.querySelector('.play-pause-btn[data-player="1"]'); if(btn){ if(player && player.getPlayerState() !== YT.PlayerState.PLAYING) clickedPlay[1]=true; btn.click();}}
           else if (e.key === 'ArrowLeft' || e.keyCode === 37) { e.preventDefault(); const btn = document.querySelector('.rewind-btn[data-player="1"]'); if(btn) btn.click(); }
           else if (e.key === 'ArrowRight' || e.keyCode === 39) { e.preventDefault(); const btn = document.querySelector('.forward-btn[data-player="1"]'); if(btn) btn.click(); }
         });
     }
     if (!window.visibilityListenerAdded) {
        window.visibilityListenerAdded = true;
        document.addEventListener('visibilitychange', () => {
           const player = players[1]; // Get player instance
           if (document.visibilityState === 'visible') { try { if (player && player.getPlayerState() === YT.PlayerState.PLAYING) { requestWakeLock(); } } catch (e) {} }
         });
     }


  } // --- END OF startVideoApp() FUNCTION ---

}); // --- END OF DOMContentLoaded WRAPPER ---
