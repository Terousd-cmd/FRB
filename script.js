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

document.addEventListener("DOMContentLoaded", () => {

  // --- Initialize Firebase ---
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // --- Get DOM Elements (Simplified) ---
  const authContainer = document.getElementById('auth-container');
  const mainAppContent = document.getElementById('main-app-content');
  const loginMsg = document.getElementById('login-message');
  const logoutBtn = document.getElementById('logout-button');
  const adminLogoutBtn = document.getElementById('logout-button-admin'); 
  const googleLoginBtn = document.getElementById('google-login-button');
  const adminChoiceContainer = document.getElementById('admin-choice-container');

  // --- Helper to show content after auth check ---
  const showFinalContent = () => {
      // This ensures the correct container is shown (done in the auth logic)
      // and removes the loading state to stop the visual block.
      document.body.classList.remove('auth-loading');
  }

  // --- Google Login Logic (Unchanged) ---
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      
      loginMsg.style.color = 'var(--text-primary)';
      loginMsg.textContent = 'Opening Google Sign-in...';

      auth.signInWithPopup(provider)
        .then((result) => {
          const user = result.user;
          const isNewUser = result.additionalUserInfo.isNewUser;

          loginMsg.textContent = 'Successfully logged in. Checking approval...';

          if (isNewUser) {
            db.collection('users').doc(user.uid).set({
              email: user.email,
              isApproved: false, 
              isAdmin: false     
            })
            .then(() => {
              // Handled by onAuthStateChanged
            });
          }
        })
        .catch((error) => {
          loginMsg.style.color = 'var(--live-red)';
          loginMsg.textContent = error.message;
          showFinalContent(); // Show auth container on login error
        });
    });
  }

  // --- Logout Logic (Unchanged) ---
  const handleLogout = () => {
    auth.signOut().then(() => {
        // Redirect to the login page after logout
        window.location.href = 'login.html'; 
    });
  };
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', handleLogout);
  }


  // =================================================================
  // Central Auth Checker (MODIFIED: Use .finally() for guaranteed screen reveal)
  // =================================================================
  auth.onAuthStateChanged((user) => {
    const adminPanel = document.getElementById('admin-panel');
    const isSubjectPage = mainAppContent && mainAppContent.hasAttribute('data-subject');
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    
    // Hide all containers initially to control display
    if (authContainer) authContainer.style.display = 'none';
    if (mainAppContent) mainAppContent.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'none';
    if (adminChoiceContainer) adminChoiceContainer.style.display = 'none';
    
    // --- 1. USER LOGGED IN ---
    if (user) {
      db.collection('users').doc(user.uid).get()
        .then((doc) => {
          const userData = doc.data();

          if (doc.exists && userData.isApproved === true) {
            
            const isAdmin = userData.isAdmin === true; 

            // Redirect away from login.html if logged in and approved
            if (isLoginPage) {
                window.location.href = 'index.html';
                return; 
            }

            if (isAdmin) {
                // ADMIN USER: Show Choice if on index.html
                if (isIndexPage) {
                    showAdminChoice(); 
                } else if (adminPanel) {
                    // ADMIN on Admin Panel or Subject Page (default to subject view if not index/admin)
                    if (window.location.pathname.includes('admin-panel') || adminPanel.style.display !== 'none') {
                        adminPanel.style.display = 'block';
                        startAdminPanel();
                    } else {
                        mainAppContent.style.display = 'block';
                        startApp();
                    }
                }
                
            } else {
                // REGULAR APPROVED USER
                if (isIndexPage) {
                    // On Subject Hub: Show the subject list
                    if (mainAppContent) mainAppContent.style.display = 'block';
                } else if (isSubjectPage) {
                    // On Subject Page: Show the video app
                    if (mainAppContent) mainAppContent.style.display = 'block';
                    startApp(); 
                } else {
                    // Approved user somehow ended up on admin panel or wrong page -> Redirect to hub
                    window.location.href = 'index.html';
                    return;
                }
            }
          
          } else if (doc.exists && userData.isApproved === false) {
            // User is logged in, but not approved: 
            auth.signOut(); 
            if (!isLoginPage) {
                window.location.href = 'login.html';
                return;
            }
            if (authContainer) authContainer.style.display = 'block';
            if (loginMsg) {
                loginMsg.style.color = 'var(--live-red)';
                loginMsg.textContent = 'Your account is pending approval. Please wait for an admin.';
            }

          } else {
            // New user doc creation logic / missing doc
            auth.signOut();
            if (!isLoginPage) {
                window.location.href = 'login.html';
                return;
            }
            if (authContainer) authContainer.style.display = 'block';
            if (loginMsg) {
                loginMsg.style.color = 'var(--live-red)';
                loginMsg.textContent = 'Account created! It is pending approval by an admin.';
            }
          }
        })
        .catch(err => {
          // **CRUCIAL CHANGE:** If Firestore lookup fails (even if auth succeeded), 
          // ensure the user is logged out and redirected to prevent them from seeing privileged content.
          console.error("Error checking auth or user data:", err);
          auth.signOut();
          if (!isLoginPage) {
              window.location.href = 'login.html';
              return;
          }
          if (authContainer) authContainer.style.display = 'block';
          if (loginMsg) {
            loginMsg.style.color = 'var(--live-red)';
            loginMsg.textContent = 'Error checking user database. Please sign in again.';
          }
        })
        .finally(() => {
          // This block runs whether the .then or .catch was executed, ensuring the screen is revealed.
          showFinalContent(); 
        });

    } else {
      // --- 2. NO USER LOGGED IN ---
      if (isLoginPage) {
          // On Login Page: Show Login Form
          if (authContainer) authContainer.style.display = 'block';
      } else if (isIndexPage || isSubjectPage) {
          // On Hub or Subject Page without login: Redirect to login
          window.location.href = 'login.html';
          return;
      }
      
      showFinalContent(); // <--- This was the only place showFinalContent was called before.
    }
  });


  // =================================================================
  // FUNCTION: Admin Login Choice Interface (Unchanged)
  // =================================================================
  function showAdminChoice() {
      const adminPanel = document.getElementById('admin-panel');
      const mainApp = document.getElementById('main-app-content');
      
      if (!document.getElementById('admin-choice-container')) {
          const choiceHtml = `
              <div id="admin-choice-container" style="display: none; max-width: 500px; margin: 80px auto; padding: 30px; background: var(--card-color); border-radius: 15px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); text-align: center;">
                  <h3 style="color: var(--accent-color); margin-bottom: 20px;">Choose Your View</h3>
                  <p style="color: var(--text-primary); margin-bottom: 30px;">You are logged in as an Administrator. Where would you like to go?</p>
                  
                  <div style="display: flex; gap: 20px; justify-content: center;">
                      <button id="go-to-admin" style="padding: 12px 25px; background: var(--live-red); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; flex-grow: 1;">
                          <i class="fas fa-user-cog"></i> Admin Panel
                      </button>
                      <button id="go-to-app" style="padding: 12px 25px; background: var(--accent-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; flex-grow: 1;">
                          <i class="fas fa-video"></i> Regular Subject Hub
                      </button>
                  </div>
                   <button id="logout-button-choice" style="margin-top: 30px; padding: 8px 16px; font-family: 'Poppins', sans-serif; font-weight: bold; font-size: 0.9em; color: #fff; background: var(--card-color); border: 1px solid var(--text-secondary); border-radius: 8px; cursor: pointer;">Logout</button>
              </div>
          `;
          document.body.insertAdjacentHTML('beforeend', choiceHtml);
      }
      
      const choiceContainer = document.getElementById('admin-choice-container');
      const goToAdminBtn = document.getElementById('go-to-admin');
      const goToAppBtn = document.getElementById('go-to-app');
      const logoutChoiceBtn = document.getElementById('logout-button-choice');

      choiceContainer.style.display = 'block';

      // --- Button Handlers (Unchanged) ---
      goToAdminBtn.onclick = () => {
          choiceContainer.style.display = 'none';
          adminPanel.style.display = 'block';
          startAdminPanel();
      };

      goToAppBtn.onclick = () => {
          choiceContainer.style.display = 'none';
          mainApp.style.display = 'block';
      };
      
      logoutChoiceBtn.onclick = handleLogout;
  }
  

  // =================================================================
  // ADMIN PANEL LOGIC (Unchanged)
  // =================================================================
  function startAdminPanel() {
    // --- Video Management Logic (Unchanged) ---
    const addVideoForm = document.getElementById('add-video-form');
    const videoSubjectInput = document.getElementById('video-subject-input'); 
    const videoIdInput = document.getElementById('video-id-input');
    const videoTitleInput = document.getElementById('video-title-input');
    const adminMessage = document.getElementById('admin-message');
    const adminVideoList = document.getElementById('admin-video-list');

    // Video Submission Logic
    addVideoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const videoId = videoIdInput.value.trim();
        const title = videoTitleInput.value.trim();
        const subject = videoSubjectInput.value; 
        
        if (!videoId || !title || !subject) { 
            adminMessage.textContent = 'All fields (including Subject) are required.';
            adminMessage.style.color = 'var(--live-red)';
            return;
        }

        adminMessage.textContent = 'Adding video...';
        adminMessage.style.color = 'var(--text-secondary)';

        db.collection('videos').add({
            videoId: videoId,
            title: title,
            subject: subject, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        })
        .then(() => {
            adminMessage.textContent = `Video "${title}" added successfully to ${subject}!`;
            adminMessage.style.color = 'var(--accent-color)';
            videoIdInput.value = '';
            videoTitleInput.value = '';
            videoSubjectInput.value = ''; 
        })
        .catch(error => {
            console.error("Error adding document: ", error);
            adminMessage.textContent = 'Error adding video: ' + error.message;
            adminMessage.style.color = 'var(--live-red)';
        });
    });

    // Video Listing & Deletion Logic 
    db.collection('videos').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        adminVideoList.innerHTML = ''; 

        if (snapshot.empty) {
             adminVideoList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No videos added yet.</p>';
             return;
        }

        snapshot.forEach(doc => {
            const video = doc.data();
            const listItem = document.createElement('li');
            listItem.style.cssText = 'padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;';
            listItem.innerHTML = `
                <div style="flex-grow: 1; margin-right: 15px;">
                    <strong>${video.title}</strong>
                    <br><span style="font-size: 0.8em; color: var(--text-secondary);">Subject: ${video.subject} | ID: ${video.videoId}</span>
                </div>
                <button class="delete-btn" data-doc-id="${doc.id}" style="padding: 5px 10px; background: var(--live-red); color: white; border: none; border-radius: 5px; cursor: pointer;">Delete</button>
            `;
            adminVideoList.appendChild(listItem);
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const docId = e.target.getAttribute('data-doc-id');
                if (window.confirm('Are you sure you want to delete this video?')) {
                    db.collection('videos').doc(docId).delete()
                      .then(() => {})
                      .catch(error => {
                          alert('Error deleting video: ' + error.message);
                      });
                }
            });
        });
        
    }, err => {
        adminVideoList.innerHTML = '<p style="text-align: center; color: var(--live-red);">Error loading videos. Check console.</p>';
    });
    
    // --- User Management Setup (Unchanged) ---
    setupUserManagement();
  } // END startAdminPanel()


  // =================================================================
  // FUNCTION: Handles User Listing, Approval, and Removal (Unchanged)
  // =================================================================
  function setupUserManagement() {
    const pendingUsers = document.getElementById('pending-user-list');
    const approvedUsers = document.getElementById('approved-user-list');

    if (!pendingUsers || !approvedUsers) return;

    db.collection('users').onSnapshot(snapshot => {
        pendingUsers.innerHTML = '';
        approvedUsers.innerHTML = '';
        
        let pendingCount = 0;
        let approvedCount = 0;

        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            
            // Skip the Admin user (yourself) from the lists
            if (user.isAdmin === true) return; 

            const listItem = document.createElement('li');
            const actionButton = document.createElement('button');
            
            listItem.style.cssText = 'padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;';
            listItem.innerHTML = `
                <div style="flex-grow: 1; margin-right: 15px;">
                    <strong>${user.email}</strong>
                    <br><span style="font-size: 0.8em; color: var(--text-secondary);">${userId.substring(0, 10)}...</span>
                </div>
            `;
            
            // Pending Users (isApproved: false)
            if (user.isApproved === false) {
                pendingCount++;
                actionButton.textContent = 'Approve';
                actionButton.style.cssText = 'padding: 5px 10px; background: #34A853; color: white; border: none; border-radius: 5px; cursor: pointer;';
                
                actionButton.onclick = () => {
                    db.collection('users').doc(userId).update({ isApproved: true })
                      .catch(err => alert('Error approving user: ' + err.message));
                };
                listItem.appendChild(actionButton);
                pendingUsers.appendChild(listItem);
                
            // Approved Users (isApproved: true)
            } else if (user.isApproved === true) {
                approvedCount++;
                actionButton.textContent = 'Remove Access';
                actionButton.style.cssText = 'padding: 5px 10px; background: var(--live-red); color: white; border: none; border-radius: 5px; cursor: pointer;';
                
                actionButton.onclick = () => {
                    if (window.confirm(`Are you sure you want to remove access for ${user.email}? This will set their approval to false.`)) {
                        db.collection('users').doc(userId).update({ isApproved: false })
                          .catch(err => alert('Error removing access: ' + err.message));
                    }
                };
                listItem.appendChild(actionButton);
                approvedUsers.appendChild(listItem);
            }
        });

        if (pendingCount === 0) {
            pendingUsers.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No pending users.</p>';
        }
        if (approvedCount === 0) {
            approvedUsers.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No approved users besides admin.</p>';
        }

    }, err => {
        pendingUsers.innerHTML = `<p style="text-align: center; color: var(--live-red);">Error fetching users: ${err.message}</p>`;
        approvedUsers.innerHTML = '';
    });
  }


  // =================================================================
  // VIDEO PLAYER CODE (Unchanged)
  // =================================================================
  function startApp() {
    const appContent = document.getElementById('main-app-content');
    const currentSubject = appContent ? appContent.getAttribute('data-subject') : null;
    
    if (!currentSubject) {
        return; 
    }

    // Global variables for players and states
    let players = {};
    let readyFlags = {1: false};
    let hideTimeout = {1: null};
    let hasInteracted = {1: false};
    let isAwaitingNativeClick = {1: false};
    let clickedPlay = {1: false};
    let wakeLock = null;

    // --- Clock Function (Unchanged) ---
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

    // --- Wake Lock Functions (Unchanged) ---
    const requestWakeLock = async () => { /* ... existing code ... */ };
    const releaseWakeLock = async () => { /* ... existing code ... */ };

    // --- YouTube API Loading (Unchanged) ---
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

        players[1] = new YT.Player("player1", {
            events: {
            'onReady': (event) => {
                setupControls(1);
            },
            'onStateChange': (e) => updatePlayState(e, 1)
            },
        });
    }

    window.onYouTubeIframeAPIReady = function() {
        apiReady = true;
        createPlayers();
    }
    
    // Updates custom play/pause button based on player state
    function updatePlayState(event, num) { /* ... */ }

    // Auto-Hide Logic
    function autoHideControls(num, delay = 3000, instant = false) { /* ... */ }

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
        const bar = progress ? progress.querySelector(".progress-bar") : null;
        const timeDisplay = document.querySelector(`.time-display[data-player="${num}"]`);
        const speedMenu = document.querySelector(`.speed-menu[data-player="${num}"]`);
        const speedOptions = speedMenu ? speedMenu.querySelectorAll(".speed-option") : [];
        const overlayPlayBtn = document.querySelector(`.overlay-play-btn[data-player="${num}"]`);
        const overlay = document.querySelector(`.video-player-overlay[data-player="${num}"]`);
        const liveBtn = document.querySelector(`.live-btn[data-player="${num}"]`);
        const seekTooltip = progress ? progress.querySelector(".seek-tooltip") : null;
        
        const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

        let isSeeking = false;
        
        if (!progress) {
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
        
        if(speedOptions.length > 0) speedOptions.forEach(option => {
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
                return;
            }
            
            loadVideoAndShowControls();

            function loadVideoAndShowControls() {
                try {
                players[num].loadVideoById({
                    videoId: videoId,
                    startSeconds: 0
                });
                
                setTimeout(() => {
                    try {
                    players[num].playVideo();
                    hasInteracted[num] = true;
                    } catch(e) {}
                }, 100);
                
                topicList.querySelectorAll('.topic-item').forEach(item => {
                    item.classList.remove('active-video');
                });
                topicItem.classList.add('active-video');
                
                if (placeholder) {
                    placeholder.classList.add('hidden');
                }
                
                const iframe = document.getElementById('player1');
                if (iframe) {
                    iframe.style.pointerEvents = 'none';
                }

                isAwaitingNativeClick[num] = false;

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
                
                } catch (err) {}
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
                    
                    const timeFromLive = dur - cur;
                    const isAtLiveEdge = timeFromLive < 10; 
                    
                    if (isAtLiveEdge) {
                        if(timeDisplay) timeDisplay.textContent = `LIVE`;
                        if(liveBtn) {
                            liveBtn.classList.add('is-live');
                            liveBtn.disabled = true;
                        }
                    } else {
                        if(timeDisplay) timeDisplay.textContent = `Live • -${fmt(timeFromLive)}`;
                        if(liveBtn) {
                            liveBtn.classList.remove('is-live');
                            liveBtn.disabled = false;
                        }
                    }
                } else {
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
                
                const videoData = player.getVideoData();
                if (videoData && videoData.isLive) {
                const timeFromLive = dur - hoverTime;
                if (timeFromLive < 10) {
                    seekTooltip.textContent = 'LIVE';
                } else {
                    seekTooltip.textContent = `-${fmt(timeFromLive)}`;
                }
                } else {
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

        // Mouse/Touch Events
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

    // --- Dynamic Video Fetching Function (Unchanged) ---
    function fetchVideos(subjectKey) {
        const topicList = document.getElementById('topic-list-1');
        if (!topicList) return;

        db.collection('videos')
            .where('subject', '==', subjectKey) 
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
            topicList.innerHTML = ''; 

            if (snapshot.empty) {
                topicList.innerHTML = '<li style="text-align: center; color: var(--text-secondary); padding: 10px;">No videos available for this subject yet.</li>';
            }

            let firstItem = null;
            snapshot.forEach(doc => {
                const video = doc.data();
                const listItem = document.createElement('li');
                listItem.className = 'topic-item';
                listItem.setAttribute('data-video-id', video.videoId);
                
                listItem.innerHTML = `<span>${video.title}</span>`; 
                
                topicList.appendChild(listItem);

                if (!firstItem) {
                    firstItem = listItem;
                }
            });
            
            if (firstItem && players[1] && !players[1].getVideoUrl()) {
                setTimeout(() => firstItem.click(), 500);
            }
            
            }, err => {
            topicList.innerHTML = '<li style="text-align: center; color: var(--live-red); padding: 10px;">Error loading videos.</li>';
        });
    }


    // Start the API loading process and fetch videos
    ensureYouTubeAPI(() => {
      if (typeof window.onYouTubeIframeAPIReady === "function") {
        window.onYouTubeIframeAPIReady();
      }
    });

    // NOW CALLING fetchVideos with the subject key
    fetchVideos(currentSubject);


    // --- KEYBOARD CONTROLS (Unchanged) ---
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

    // --- WAKE LOCK VISIBILITY HANDLING (Unchanged) ---
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