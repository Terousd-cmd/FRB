// =================================================================
// YOUR LIVE FIREBASE CONFIG
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
// AUTHENTICATION & APP LOGIC (Using v8 SDK)
// =================================================================

// --- THIS IS THE FIX ---
// Wait for the entire HTML document to be loaded before running any JS
document.addEventListener("DOMContentLoaded", () => {

  // --- Initialize Firebase ---
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // --- Get DOM Elements (Simplified) ---
  const authContainer = document.getElementById('auth-container');
  const mainAppContent = document.getElementById('main-app-content');
  const loginForm = document.getElementById('login-form');
  const loginMsg = document.getElementById('login-message');
  const logoutBtn = document.getElementById('logout-button');
  const googleLoginBtn = document.getElementById('google-login-button');

  // --- All other form elements are removed ---


  // --- Form Toggling Removed ---
  

  // --- Sign Up Logic Removed ---
  

  // --- Login Logic Removed ---


  // --- Google Login Logic ---
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      
      loginMsg.style.color = 'var(--text-primary)';
      loginMsg.textContent = 'Opening Google Sign-in...';

      auth.signInWithPopup(provider)
        .then((result) => {
          // The signed-in user info.
          const user = result.user;
          const isNewUser = result.additionalUserInfo.isNewUser;

          loginMsg.textContent = 'Successfully logged in. Checking approval...';

          // If they are a new user, create their "isApproved: false" doc
          if (isNewUser) {
            db.collection('users').doc(user.uid).set({
              email: user.email,
              isApproved: false // New social users must also be approved
            })
            .then(() => {
              // The onAuthStateChanged listener will handle the redirect
            });
          }
          // If they are an existing user, the onAuthStateChanged listener
          // will check their approval status and log them in.
        })
        .catch((error) => {
          // Handle Errors here.
          loginMsg.style.color = 'var(--live-red)';
          loginMsg.textContent = error.message;
        });
    });
  }

  // --- Facebook Login Logic Removed ---


  // --- Forgot Password Logic Removed ---


  // --- Logout Logic ---
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut();
    });
  }

  // --- Central Auth Checker ---
  // This function runs when the page loads AND when login/logout happens
  auth.onAuthStateChanged((user) => {
    if (user) {
      // A user is logged in. Now check if they are approved.
      db.collection('users').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists && doc.data().isApproved === true) {
            // --- USER IS LOGGED IN AND APPROVED ---
            // Hide login, show the video player
            if (authContainer) authContainer.style.display = 'none';
            if (mainAppContent) mainAppContent.style.display = 'block';
            
            // --- Run the app! ---
            startApp();

          } else if (doc.exists && doc.data().isApproved === false) {
            // User is logged in, but not approved
            auth.signOut(); // Log them out
            if (loginMsg) {
                loginMsg.style.color = 'var(--live-red)';
                loginMsg.textContent = 'Your account is pending approval. Please wait for an admin.';
            }
          } else {
            // User doc doesn't exist for some reason, or no approval field
            // This can happen if a social login user logs in for the first time
            // and their doc hasn't been created yet. We check again.
            if (!doc.exists) {
              console.log("Creating user doc for social login...");
              db.collection('users').doc(user.uid).set({
                email: user.email,
                isApproved: false
              }).then(() => {
                auth.signOut();
                if (loginMsg) {
                  loginMsg.style.color = 'var(--live-red)';
                  loginMsg.textContent = 'Account created! It is pending approval by an admin.';
                }
              });
            } else {
              // Doc exists but something else is wrong.
              auth.signOut();
              if (loginMsg) {
                  loginMsg.style.color = 'var(--live-red)';
                  loginMsg.textContent = 'Error: Could not verify account. Contact admin.';
              }
            }
          }
        })
        .catch(err => {
          console.error("Error checking auth:", err);
          auth.signOut();
          if (loginMsg) {
            loginMsg.style.color = 'var(--live-red)';
            loginMsg.textContent = 'Error checking database. Please try again.';
          }
        });

    } else {
      // No user is logged in. Show the login form.
      if (authContainer) authContainer.style.display = 'block';
      if (mainAppContent) mainAppContent.style.display = 'none';
    }
  });


  // =================================================================
  // ALL YOUR *OLD* VIDEO PLAYER CODE GOES INSIDE THIS FUNCTION
  // =================================================================
  function startApp() {
    console.log("App starting for approved user...");

    // Global variables for players and states
    let players = {};
    let readyFlags = {1: false};
    let hideTimeout = {1: null};
    let hasInteracted = {1: false};
    let isAwaitingNativeClick = {1: false};
    let clickedPlay = {1: false};
    let wakeLock = null;

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
    setInterval(updateClock, 1000);
    updateClock();

    // --- Wake Lock Functions ---
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && wakeLock === null) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock is active.');
          wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock was released by system.');
            wakeLock = null;
          });
        } catch (err) {
          console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
        }
      }
    };

    const releaseWakeLock = async () => {
      if ('wakeLock' in navigator && wakeLock !== null) {
        try {
          await wakeLock.release();
          wakeLock = null;
          console.log('Screen Wake Lock released.');
        } catch (err) {
          console.error(`Wake Lock release failed: ${err.name}, ${err.message}`);
        }
      }
    };

    // --- YouTube API Loading ---
    function ensureYouTubeAPI(callback) {
      if (window.YT && YT.Player) {
        callback();
      } else {
        setTimeout(() => ensureYouTubeAPI(callback), 200);
      }
    }

    let apiReady = false;
    let playersInitialized = false;

    function createPlayers() {
      if (!apiReady || playersInitialized) {
        return;
      }
      playersInitialized = true;
      console.log("Initializing player...");

      players[1] = new YT.Player("player1", {
        events: {
          'onReady': (event) => {
            setupControls(1);
          },
          'onStateChange': (e) => updatePlayState(e, 1)
        },
      });
    }

    // This is called by the <script src="https://www.youtube.com/iframe_api"></script>
    // We need to make sure it's globally available.
    window.onYouTubeIframeAPIReady = function() {
      console.log("YouTube API Ready!");
      apiReady = true;
      createPlayers();
    }

    // Updates custom play/pause button based on player state
    function updatePlayState(event, num) {
      const playIcon = document.querySelector(`.play-pause-btn[data-player="${num}"] i`);
      const controls = document.querySelector(`.custom-controls[data-player="${num}"]`);
      const overlayPlayBtn = document.querySelector(`.overlay-play-btn[data-player="${num}"]`);
      const overlayIcon = overlayPlayBtn.querySelector('i');
      
      if (!playIcon || !controls || !overlayPlayBtn || !overlayIcon) return;
      
      const overlay = document.querySelector(`.video-player-overlay[data-player="${num}"]`);
      
      if (event.data === YT.PlayerState.PLAYING) {
        playIcon.classList.remove("fa-play");
        playIcon.classList.add("fa-pause");
        
        overlayIcon.classList.remove("fa-play");
        overlayIcon.classList.add("fa-pause");
        
        requestWakeLock();
        
        // Takeover logic for native click
        if (isAwaitingNativeClick[num]) {
          isAwaitingNativeClick[num] = false;
          hasInteracted[num] = true;
          clickedPlay[num] = true;

          controls.classList.add('no-transition');
          if (overlay) {
            overlay.classList.add('no-transition');
            overlay.classList.remove('limbo');
          }
          
          controls.classList.add('active');
          controls.classList.remove('hidden');
          
          const iframe = document.getElementById('player1');
          if(iframe) {
            iframe.style.pointerEvents = 'none';
          }
        }
        
        if (hasInteracted[num]) {
          if (clickedPlay[num]) {
            autoHideControls(num, 2, true);
            clickedPlay[num] = false;
          } else {
            autoHideControls(num, 3000);
          }
        }
      } else if (event.data === YT.PlayerState.ENDED) {
        playIcon.classList.remove("fa-pause");
        playIcon.classList.add("fa-play");

        overlayIcon.classList.remove("fa-pause");
        overlayIcon.classList.add("fa-play");
        overlayPlayBtn.classList.remove("hidden");
        
        releaseWakeLock();
        
        try {
          players[num].pauseVideo();
          players[num].seekTo(0);
        } catch (e) {}
        
      } else {
        playIcon.classList.remove("fa-pause");
        playIcon.classList.add("fa-play");

        overlayIcon.classList.remove("fa-pause");
        overlayIcon.classList.add("fa-play");
        overlayPlayBtn.classList.remove("hidden");
        
        releaseWakeLock();
        
        clearTimeout(hideTimeout[num]);
        if (hasInteracted[num]) {
          controls.classList.add('no-transition');
          if(overlay) {
             overlay.classList.add('no-transition');
             overlay.classList.remove('limbo');
          }
          
          controls.classList.remove('hidden');
          
          setTimeout(() => {
            controls.classList.remove('no-transition');
            if(overlay) overlay.classList.remove('no-transition');
          }, 50);
        }
      }
    }

    // Auto-Hide Logic
    function autoHideControls(num, delay = 3000, instant = false) {
      const player = players[num];
      const controls = document.querySelector(`.custom-controls[data-player="${num}"]`);
      const overlayPlayBtn = document.querySelector(`.overlay-play-btn[data-player="${num}"]`);
      
      if (!player || !controls || !overlayPlayBtn || !hasInteracted[num]) return;
      
      clearTimeout(hideTimeout[num]);

      try {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
          const overlay = document.querySelector(`.video-player-overlay[data-player="${num}"]`);
          
          if (instant) {
            controls.classList.add('no-transition');
            if(overlay) {
              overlay.classList.add('no-transition');
              overlay.classList.remove('limbo');
            }
          }
          
          hideTimeout[num] = setTimeout(() => {
            controls.classList.add("hidden");
            overlayPlayBtn.classList.add("hidden");
            
            if (instant) {
              setTimeout(() => {
                controls.classList.remove('no-transition');
                if(overlay) overlay.classList.remove('no-transition');
              }, 50);
            }
          }, delay);
        }
      } catch (e) {
        console.log("Player not ready for auto-hide check");
      }
    }

    // Setup all event listeners for custom controls
    function setupControls(num) {
      readyFlags[num] = true;
      const player = players[num];
      const videoPlayerContainer = document.querySelector(`.video-player[data-id="${num}"]`);
      const controls = document.querySelector(`.custom-controls[data-player="${num}"]`);
      
      const rewindBtn = document.querySelector(`.rewind-btn[data-player="${num}"]`);
      const forwardBtn = document.querySelector(`.forward-btn[data-player="${num}"]`);
      const playBtn = document.querySelector(`.play-pause-btn[data-player="${num}"]`);
      const volumeBtn = document.querySelector(`.volume-btn[data-player="${num}"]`);
      const fullscreenBtn = document.querySelector(`.fullscreen-btn[data-player="${num}"]`);
      const settingsBtn = document.querySelector(`.settings-btn[data-player="${num}"]`);
      const progress = document.querySelector(`.progress-container[data-player="${num}"]`);
      const bar = progress.querySelector(".progress-bar");
      const timeDisplay = document.querySelector(`.time-display[data-player="${num}"]`);
      const speedMenu = document.querySelector(`.speed-menu[data-player="${num}"]`);
      const speedOptions = speedMenu.querySelectorAll(".speed-option");
      const overlayPlayBtn = document.querySelector(`.overlay-play-btn[data-player="${num}"]`);
      const overlay = document.querySelector(`.video-player-overlay[data-player="${num}"]`);
      const liveBtn = document.querySelector(`.live-btn[data-player="${num}"]`);
      const seekTooltip = progress.querySelector(".seek-tooltip");
      
      const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

      let isSeeking = false;
      
      if (!progress) {
          console.error("Progress container not found");
          return;
      }

      // Overlay Play Button
      if(overlayPlayBtn) overlayPlayBtn.onclick = (e) => {
        e.stopPropagation();
        if (players[num] && players[num].getPlayerState() !== YT.PlayerState.PLAYING) {
            clickedPlay[num] = true;
        }
        if(playBtn) playBtn.click();
      };
      
      // Click on the overlay background
      if (overlay) {
        overlay.onclick = () => {
          if (!hasInteracted[num]) return;
          
          if (players[num] && players[num].getPlayerState() !== YT.PlayerState.PLAYING) {
              clickedPlay[num] = true;
          }
          if(playBtn) playBtn.click();
        };
      }

      // Show controls on mouse move
      if(videoPlayerContainer) videoPlayerContainer.addEventListener("mousemove", () => {
        if (hasInteracted[num]) {
          if(controls) controls.classList.remove('no-transition');
          if(overlay) {
            overlay.classList.remove('no-transition');
            overlay.classList.remove('limbo');
          }
          if(overlayPlayBtn) {
            overlayPlayBtn.classList.remove('no-transition');
          }
          
          if(controls) controls.classList.remove("hidden");
          if(overlayPlayBtn) overlayPlayBtn.classList.remove("hidden");
          autoHideControls(num, 3000);
        }
      });
      
      if(controls) controls.addEventListener("mouseenter", () => {
        clearTimeout(hideTimeout[num]);
        controls.classList.remove("hidden");
        if(overlayPlayBtn) overlayPlayBtn.classList.remove("hidden");
      });

      if(controls) controls.addEventListener("mouseleave", () => {
        if (hasInteracted[num]) {
          autoHideControls(num, 3000);
        }
      });

      // Settings Button
      if(settingsBtn) settingsBtn.onclick = (e) => {
        e.stopPropagation();
        hasInteracted[num] = true;
        clearTimeout(hideTimeout[num]);
        if(controls) controls.classList.remove("hidden");
        if(speedMenu) speedMenu.style.display = speedMenu.style.display === "block" ? "none" : "block";
      };
      
      document.addEventListener("click", () => {
        if(speedMenu) speedMenu.style.display = "none";
        if (hasInteracted[num]) {
          try {
            if (player.getPlayerState() === YT.PlayerState.PLAYING) {
              autoHideControls(num, 3000);
            }
          } catch (e) {}
        }
      });
      
      if(speedMenu) speedMenu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      
      if(speedOptions) speedOptions.forEach(option => {
        option.addEventListener("click", () => {
          try {
            const speed = parseFloat(option.getAttribute("data-speed"));
            player.setPlaybackRate(speed);
            speedOptions.forEach(opt => opt.classList.remove("current-speed"));
            option.classList.add("current-speed");
            speedMenu.style.display = "none";
            if (hasInteracted[num] && player.getPlayerState() === YT.PlayerState.PLAYING) {
              autoHideControls(num, 3000);
            }
          } catch (e) {}
        });
      });

      // Rewind Button
      if(rewindBtn) rewindBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const newTime = Math.max(0, player.getCurrentTime() - 10);
          player.seekTo(newTime, true);
        } catch (e) {}
      };
      
      // Forward Button
      if(forwardBtn) forwardBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const newTime = Math.min(player.getDuration(), player.getCurrentTime() + 10);
          player.seekTo(newTime, true);
        } catch (e) {}
      };

      // Main Play/Pause Button
      if(playBtn) playBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const state = player.getPlayerState();
          if (state === YT.PlayerState.PLAYING) {
            player.pauseVideo();
          } else {
            clickedPlay[num] = true;
            player.playVideo();
          }
        } catch (e) {
          try {
            clickedPlay[num] = true;
            player.playVideo();
          } catch (err) {}
        }
      };

      // Volume Button
      if(volumeBtn) volumeBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const icon = volumeBtn.querySelector("i");
          if (player.isMuted()) {
            player.unMute();
            icon.classList.replace("fa-volume-mute", "fa-volume-up");
          } else {
            player.mute();
            icon.classList.replace("fa-volume-up", "fa-volume-mute");
          }
        } catch (e) {}
      };

      // Fullscreen Button
      if(fullscreenBtn) fullscreenBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const container = document.querySelector(`.video-player[data-id="${num}"]`);
          const icon = fullscreenBtn.querySelector("i");
          const exitIcon = "fa-arrows-rotate";
          const enterIcon = "fa-compress";

          if (!document.fullscreenElement) {
            if(container) container.requestFullscreen?.();
            icon.classList.replace(exitIcon, enterIcon);
            if (screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(err => {});
            }
          } else {
            document.exitFullscreen?.();
            icon.classList.replace(enterIcon, exitIcon);
            if (screen.orientation && screen.orientation.unlock) {
              screen.orientation.unlock();
            }
          }
        } catch (e) {}
      };

      // Live Button Click
      if(liveBtn) liveBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          player.seekTo(player.getDuration(), true);
        } catch (e) {}
      };

      // --- SIDEBAR LOGIC ---
      const topicList = document.querySelector(`.topic-list[data-player="${num}"]`);
      const placeholder = document.getElementById('video-placeholder');
      
      if (topicList) {
        topicList.addEventListener('click', (e) => {
          const topicItem = e.target.closest('.topic-item');
          if (!topicItem) return;
      
          const videoId = topicItem.getAttribute('data-video-id');
          
          if (!players[num]) {
            console.error("Player not ready, cannot load video.");
            return;
          }
          
          loadVideoAndShowControls();

          function loadVideoAndShowControls() {
            try {
              // Load and AUTOPLAY the video
              players[num].loadVideoById({
                videoId: videoId,
                startSeconds: 0
              });
              
              // Explicitly play the video
              setTimeout(() => {
                try {
                  players[num].playVideo();
                  hasInteracted[num] = true;
                } catch(e) {}
              }, 100);
              
              // Update the active state in the sidebar
              topicList.querySelectorAll('.topic-item').forEach(item => {
                item.classList.remove('active-video');
              });
              topicItem.classList.add('active-video');
              
              // Hide the placeholder
              if (placeholder) {
                placeholder.classList.add('hidden');
              }
              
              // Make sure iframe is NOT clickable (overlay blocks it)
              const iframe = document.getElementById('player1');
              if (iframe) {
                iframe.style.pointerEvents = 'none';
              }

              // No need to wait for native click - we're autoplaying
              isAwaitingNativeClick[num] = false;

              // Show custom controls immediately
              if (controls) {
                controls.classList.add('no-transition');
                controls.classList.add('active');
                controls.classList.remove('hidden');
                setTimeout(() => {
                  controls.classList.remove('no-transition');
                }, 50);
              }
              
              const overlay = document.querySelector(`.video-player-overlay[data-player="${num}"]`);
              if (overlay) {
                overlay.classList.remove('limbo');
              }
              
            } catch (err) {
              console.error("Error loading new video:", err);
            }
          }
        });
      }

      // --- Progress Bar Update ---
      setInterval(() => {
        if (!readyFlags[num] || isSeeking) return;
        try {
          const dur = player.getDuration();
          if (!dur || dur <= 0) return;
          
          const cur = player.getCurrentTime();
          const percent = (cur / dur)* 100;
          if(bar) bar.style.width = percent + "%";
          
          // Live button logic
          const videoData = player.getVideoData();
          if (videoData && videoData.isLive) {
            if(liveBtn) liveBtn.style.display = 'inline-block';
            
            // For live streams, calculate how close we are to the live edge
            // If progress bar is near 100%, we're watching live
            const timeFromLive = dur - cur;
            const isAtLiveEdge = timeFromLive < 10; // Within 10 seconds of live
            
            if (isAtLiveEdge) {
              if(timeDisplay) timeDisplay.textContent = `LIVE`;
              if(liveBtn) {
                liveBtn.classList.add('is-live');
                liveBtn.disabled = true;
              }
            } else {
              // If seeked back, show how far behind live
              if(timeDisplay) timeDisplay.textContent = `Live • -${fmt(timeFromLive)}`;
              if(liveBtn) {
                liveBtn.classList.remove('is-live');
                liveBtn.disabled = false;
              }
            }
          } else {
            // For recorded videos, show current time / duration
            if(timeDisplay) timeDisplay.textContent = `${fmt(cur)} / ${fmt(dur)}`;
            if(liveBtn) liveBtn.style.display = 'none';
          }
        } catch (e) {}
      }, 500);

      // Seek Tooltip Logic
      if(progress) progress.addEventListener("mousemove", (e) => {
        if (!readyFlags[num] || !seekTooltip) return;
        try {
          const rect = progress.getBoundingClientRect();
          const percent = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
          const dur = player.getDuration();
          
          if (dur > 0) {
            const hoverTime = dur * percent;
            
            // Check if live video
            const videoData = player.getVideoData();
            if (videoData && videoData.isLive) {
              // For live videos, show time from live edge
              const timeFromLive = dur - hoverTime;
              if (timeFromLive < 10) {
                seekTooltip.textContent = 'LIVE';
              } else {
                seekTooltip.textContent = `-${fmt(timeFromLive)}`;
              }
            } else {
              // For recorded videos, show timestamp
              seekTooltip.textContent = fmt(hoverTime);
            }
            
            let newLeftPx = e.clientX - rect.left;
            const tooltipWidth = seekTooltip.offsetWidth;
            const barWidth = rect.width;

            if (newLeftPx < tooltipWidth / 2) {
              newLeftPx = tooltipWidth / 2;
            }
            if (newLeftPx > barWidth - (tooltipWidth / 2)) {
              newLeftPx = barWidth - (tooltipWidth / 2);
            }
            
            seekTooltip.style.left = newLeftPx + "px";
          }
        } catch (e) {}
      });

      // DRAG-TO-SEEK LOGIC
      function handleSeek(e) {
        if (!readyFlags[num]) return;
        try {
          const rect = progress.getBoundingClientRect();
          const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
          const percent = Math.min(Math.max(0, (clientX - rect.left) / rect.width), 1);
          const dur = player.getDuration();
          
          if (dur > 0) {
            const newTime = dur * percent;
            player.seekTo(newTime, true);
            
            if(bar) bar.style.width = percent * 100 + "%";
            if(timeDisplay) timeDisplay.textContent = `${fmt(newTime)} / ${fmt(dur)}`;
          }
        } catch (err) {}
      }

      // Mouse Events
      if(progress) progress.addEventListener("mousedown", (e) => {
        isSeeking = true;
        hasInteracted[num] = true;
        handleSeek(e);
      });
      
      document.addEventListener("mousemove", (e) => {
        if (!isSeeking) return;
        handleSeek(e);
      });
      
      document.addEventListener("mouseup", () => {
        isSeeking = false;
      });

      // Touch Events
      if(progress) progress.addEventListener("touchstart", (e) => {
        isSeeking = true;
        hasInteracted[num] = true;
        handleSeek(e);
      });

      document.addEventListener("touchmove", (e) => {
        if (!isSeeking) return;
        handleSeek(e);
      });

      document.addEventListener("touchend", () => {
        isSeeking = false;
      });
    }

    // Start the API loading process
    ensureYouTubeAPI(() => {
      if (typeof window.onYouTubeIframeAPIReady === "function") {
        window.onYouTubeIframeAPIReady();
      }
    });

    // --- KEYBOARD CONTROLS ---
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      
      if (!hasInteracted[1]) return;
      
      // Spacebar: Play/Pause
      if (e.key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        const playBtn = document.querySelector('.play-pause-btn[data-player="1"]');
        if (playBtn) {
          if (players[1] && players[1].getPlayerState() !== YT.PlayerState.PLAYING) {
            clickedPlay[1] = true;
          }
          playBtn.click();
        }
      }
      // Left Arrow: Rewind
      else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
        e.preventDefault();
        const rewindBtn = document.querySelector('.rewind-btn[data-player="1"]');
        if (rewindBtn) {
          rewindBtn.click();
        }
      }
      // Right Arrow: Forward
      else if (e.key === 'ArrowRight' || e.keyCode === 39) {
        e.preventDefault();
        const forwardBtn = document.querySelector('.forward-btn[data-player="1"]');
        if (forwardBtn) {
          forwardBtn.click();
        }
      }
    });

    // --- WAKE LOCK VISIBILITY HANDLING ---
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        try {
          if (players[1] && players[1].getPlayerState() === YT.PlayerState.PLAYING) {
            requestWakeLock();
          }
        } catch (e) {}
      }
    });
    
  }
  // --- END OF startApp() FUNCTION ---

}); // --- END OF DOMContentLoaded WRAPPER ---

