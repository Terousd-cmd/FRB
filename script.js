// This script is now a module.
// We must wait for the firebaseServices to be imported from index.html
async function main() {
  // Wait until the firebaseServices object is attached to the window
  while (!window.firebaseServices) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // =================================================================
  // AUTH & LOGIN LOGIC (v9 MODULAR SYNTAX)
  // =================================================================

  // --- Get Firebase services from the window object ---
  const { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, doc, setDoc, getDoc } = window.firebaseServices;

  // --- Get DOM Elements ---
  const authContainer = document.getElementById('auth-container');
  const mainAppContent = document.getElementById('main-app-content');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  const loginEmail = document.getElementById('login-email');
  const loginPass = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-button');
  const loginMsg = document.getElementById('login-message');

  const signupEmail = document.getElementById('signup-email');
  const signupPass = document.getElementById('signup-password');
  const signupBtn = document.getElementById('signup-button');
  const signupMsg = document.getElementById('signup-message');

  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const logoutBtn = document.getElementById('logout-button');

  // --- Form Toggling ---
  showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  });

  // --- Sign Up Logic (v9) ---
  signupBtn.addEventListener('click', async () => {
    const email = signupEmail.value;
    const pass = signupPass.value;
    
    signupMsg.style.color = 'var(--text-primary)';
    signupMsg.textContent = 'Processing...';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // User created. Now save their "approval" status to the database.
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        email: email,
        isApproved: false // <-- This is the approval field
      });

      signupMsg.style.color = 'var(--accent-color)';
      signupMsg.textContent = 'Success! An admin must approve your account before you can log in.';
      // Don't log them in, force them to wait for approval
      await signOut(auth);

    } catch (error) {
      signupMsg.style.color = 'var(--live-red)';
      signupMsg.textContent = error.message;
    }
  });

  // --- Login Logic (v9) ---
  loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value;
    const pass = loginPass.value;

    loginMsg.style.color = 'var(--text-primary)';
    loginMsg.textContent = 'Logging in...';

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // Login was successful, but we will check approval
      // in the onAuthStateChanged listener below.
      // This listener will run automatically.
      loginMsg.textContent = '';
    } catch (error) {
      loginMsg.style.color = 'var(--live-red)';
      loginMsg.textContent = error.message;
    }
  });

  // --- Logout Logic (v9) ---
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    // Reload the page to reset the player state
    window.location.reload();
  });

  // --- Central Auth Checker (v9) ---
  // This function runs when the page loads AND when login/logout happens
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // A user is logged in. Now check if they are approved.
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists() && docSnap.data().isApproved === true) {
          // --- USER IS LOGGED IN AND APPROVED ---
          // Hide login, show the video player
          authContainer.style.display = 'none';
          mainAppContent.style.display = 'block';
          
          // --- Run the app! ---
          startApp();

        } else if (docSnap.exists() && docSnap.data().isApproved === false) {
          // User is logged in, but not approved
          await signOut(auth); // Log them out
          loginMsg.style.color = 'var(--live-red)';
          loginMsg.textContent = 'Your account is pending approval. Please wait for an admin.';
        } else {
          // User doc doesn't exist for some reason, or no approval field
          await signOut(auth);
          loginMsg.style.color = 'var(--live-red)';
          loginMsg.textContent = 'Error: Could not verify account. Contact admin.';
        }
      } catch (err) {
        await signOut(auth);
        loginMsg.style.color = 'var(--live-red)';
        loginMsg.textContent = 'Error checking database. Please try again.';
      }

    } else {
      // No user is logged in. Show the login form.
      authContainer.style.display = 'block';
      mainAppContent.style.display = 'none';
    }
  });


  // =================================================================
  // YOUR ORIGINAL VIDEO PLAYER APP CODE
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

    // This function is defined by the YouTube API script
    // We need to make sure it's globally accessible
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

      // Overlay Play Button
      overlayPlayBtn.onclick = (e) => {
        e.stopPropagation();
        if (players[num] && players[num].getPlayerState() !== YT.PlayerState.PLAYING) {
            clickedPlay[num] = true;
        }
        playBtn.click();
      };
      
      // Click on the overlay background
      if (overlay) {
        overlay.onclick = () => {
          if (!hasInteracted[num]) return;
          
          if (players[num] && players[num].getPlayerState() !== YT.PlayerState.PLAYING) {
              clickedPlay[num] = true;
          }
          playBtn.click();
        };
      }

      // Show controls on mouse move
      videoPlayerContainer.addEventListener("mousemove", () => {
        if (hasInteracted[num]) {
          controls.classList.remove('no-transition');
          if(overlay) {
            overlay.classList.remove('no-transition');
            overlay.classList.remove('limbo');
          }
          if(overlayPlayBtn) {
            overlayPlayBtn.classList.remove('no-transition');
          }
          
          controls.classList.remove("hidden");
          overlayPlayBtn.classList.remove("hidden");
          autoHideControls(num, 3000);
        }
      });
      
      controls.addEventListener("mouseenter", () => {
        clearTimeout(hideTimeout[num]);
        controls.classList.remove("hidden");
        overlayPlayBtn.classList.remove("hidden");
      });

      controls.addEventListener("mouseleave", () => {
        if (hasInteracted[num]) {
          autoHideControls(num, 3000);
        }
      });

      // Settings Button
      settingsBtn.onclick = (e) => {
        e.stopPropagation();
        hasInteracted[num] = true;
        clearTimeout(hideTimeout[num]);
        controls.classList.remove("hidden");
        speedMenu.style.display = speedMenu.style.display === "block" ? "none" : "block";
      };
      
      document.addEventListener("click", () => {
        speedMenu.style.display = "none";
        if (hasInteracted[num]) {
          try {
            if (player.getPlayerState() === YT.PlayerState.PLAYING) {
              autoHideControls(num, 3000);
            }
          } catch (e) {}
        }
      });
      
      speedMenu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      
      speedOptions.forEach(option => {
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
      rewindBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const newTime = Math.max(0, player.getCurrentTime() - 10);
          player.seekTo(newTime, true);
        } catch (e) {}
      };
      
      // Forward Button
      forwardBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const newTime = Math.min(player.getDuration(), player.getCurrentTime() + 10);
          player.seekTo(newTime, true);
        } catch (e) {}
      };

      // Main Play/Pause Button
      playBtn.onclick = () => {
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
      volumeBtn.onclick = () => {
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
      fullscreenBtn.onclick = () => {
        hasInteracted[num] = true;
        try {
          const container = document.querySelector(`.video-player[data-id="${num}"]`);
          const icon = fullscreenBtn.querySelector("i");
          const exitIcon = "fa-arrows-rotate";
          const enterIcon = "fa-compress";

          if (!document.fullscreenElement) {
            container.requestFullscreen?.();
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
      liveBtn.onclick = () => {
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
          bar.style.width = percent + "%";
          
          // Live button logic
          const videoData = player.getVideoData();
          if (videoData && videoData.isLive) {
            liveBtn.style.display = 'inline-block';
            
            // For live streams, calculate how close we are to the live edge
            // If progress bar is near 100%, we're watching live
            const timeFromLive = dur - cur;
            const isAtLiveEdge = timeFromLive < 10; // Within 10 seconds of live
            
            if (isAtLiveEdge) {
              timeDisplay.textContent = `LIVE`;
              liveBtn.classList.add('is-live');
              liveBtn.disabled = true;
            } else {
              // If seeked back, show how far behind live
              timeDisplay.textContent = `Live • -${fmt(timeFromLive)}`;
              liveBtn.classList.remove('is-live');
              liveBtn.disabled = false;
            }
          } else {
            // For recorded videos, show current time / duration
            timeDisplay.textContent = `${fmt(cur)} / ${fmt(dur)}`;
            liveBtn.style.display = 'none';
          }
        } catch (e) {}
      }, 500);

      // Seek Tooltip Logic
      progress.addEventListener("mousemove", (e) => {
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
            
            bar.style.width = percent * 100 + "%";
            timeDisplay.textContent = `${fmt(newTime)} / ${fmt(dur)}`;
          }
        } catch (err) {}
      }

      // Mouse Events
      progress.addEventListener("mousedown", (e) => {
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
      progress.addEventListener("touchstart", (e) => {
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
    // This will call window.onYouTubeIframeAPIReady when done
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

  } // --- End of startApp() function ---

} // --- End of main() function ---

// Start the entire application
main();

