(function () {
    "use strict";
  
    var util = new edaplotjs.Util();
    var api_url_root = util.getRootApiUrl();
    var intervalVal = 'alltime' // Default in all-time
  
    /**
     * Fetch leaderboard data and populate the table.
     * @param {string} currentUserId - The current user's ID.
     */
    function fetchLeaderboard(currentUserId) {
        fetch(`${api_url_root}/leaderboard`)
            .then(response => response.json())
            .then(data => populateLeaderboard(data, currentUserId))
            .catch(error => console.error('Error fetching leaderboard data:', error));
    }

    /**
     * Fetch and populate the seasons' dropdown, and initiate the countdown if a season is active.
     */
    function populateCheckSeasons() {
        fetch(`${api_url_root}/get_seasons`)
            .then(response => response.json())
            .then(data => {

                const lastSeason = data.seasons[data.seasons.length-1]
                if (lastSeason !== undefined) {
                    const timeNow = Math.floor(Date.now() / 1000);
                    let isSeason = '';
                    let interval = 0;
    
                    if (timeNow <= lastSeason.season_end && timeNow >= lastSeason.season_start) {
                        isSeason = 'countdownFinish';
                        interval = lastSeason.season_end;
                    } else if (timeNow < lastSeason.season_start) {
                        isSeason = 'countdownStart';
                        interval = lastSeason.season_start;
                    }
    
                    if (isSeason) {
                        // Update every second
                        const x = setInterval(function() {
                            const now = Math.floor(Date.now() / 1000);
                            const distance = interval - now;
        
                            // Time calculations for days, hours, minutes and seconds
                            const days = Math.floor(distance / (60 * 60 * 24));
                            const hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60));
                            const minutes = Math.floor((distance % (60 * 60)) / 60);
                            const seconds = Math.floor(distance % 60);
        
                            // Output the result in an element with id="seasonCountdown"
                            seasonCountdown.innerHTML = `${days}${window.i18n.t('days')} ${hours}${window.i18n.t('hours')} ${minutes}${window.i18n.t('minutes')} ${seconds}${window.i18n.t('seconds')} ` + (isSeason === 'countdownFinish' ? window.i18n.t('until-season-ends') : window.i18n.t('until-season-begins'));
                            
                            // If the countdown is over, stop the countdown and set the text accordingly
                            if (distance < 0 && isSeason == 'countdownFinish') {
                                clearInterval(x);
                                seasonCountdown.innerHTML = window.i18n.t('no-active-season');
                            } else if (distance < 0 && isSeason == 'countdownStart'){
                                clearInterval(x);
                                seasonCountdown.innerHTML = populateCheckSeasons();
                            }
                        }, 1000);
                    } else {
                        // If not within a season or before a season starts, keep the initial message
                        seasonCountdown.classList.add("text-white", "font-weight-bold");
                        seasonCountdown.innerHTML = window.i18n.t('no-active-season');
                    }
                } else {
                    // Keep the initial message if we have never specified a season before as well
                    seasonCountdown.classList.add("text-white", "font-weight-bold");
                    seasonCountdown.innerHTML = window.i18n.t('no-active-season');
                }

                const selector = document.getElementById('seasonSelector');
                selector.innerHTML = ''; // Clear all the other options
                const select = document.createElement('option');
                select.textContent = window.i18n.t('select-season');
                select.value = 'alltime' // If we click the Select a Season, we display the alltime leaderboard instead
                selector.appendChild(select);
                data.seasons.forEach(season => {
                    const option = document.createElement('option');
                    option.value = season.id; 
                    option.textContent = window.i18n.t('season') + season.name;
                    selector.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching seasons:', error));
    }
  
    /**
     * Populate leaderboard table with data.
     * @param {any} data - The leaderboard data.
     * @param {string} currentUserId - The current user's ID.
     */
    function populateLeaderboard(data, currentUserId) {
        const leaderboardBody = document.getElementById('leaderboard').querySelector('tbody');
        leaderboardBody.innerHTML = ''; // Initialize the leaderboard
        let rank = 1;
        let currentUserDisplayed = false;

        data.every(entry => { // Top 10 users in points, stop at the 10th that is not a guest
            if(rank === 11) {return false}

            let isGoogle = (entry.client_id).split('.')[0] === 'google'; // We need to make sure we store only the signed-in users; part of enabling gamification.
            
            if(entry.client_type == 3 && isGoogle) {
                const isCurrentUser = (entry.client_id).split('.')[1] === currentUserId; 
                currentUserDisplayed = currentUserDisplayed || isCurrentUser;

                const row = leaderboardBody.insertRow();
                
                if (rank === 1) {
                row.classList.add('first-place-highlight', 'animate__animated'); // Style the first place

                if (isCurrentUser) {
                    row.classList.add('current-user'); // Additional class for current user
                }
                } else if (rank === 2){
                    row.classList.add('second-place-highlight', 'animate__animated'); // Style the second place
                } else if (rank === 3){
                    row.classList.add('third-place-highlight', 'animate__animated'); // Style the third place
                } else {
                    const contextClass = isCurrentUser ? 'current-user' : ''; // If it's not in top-three, use a table success class
                    row.className = contextClass;
                }
        
                row.insertCell(0).textContent = rank;
                row.insertCell(1).textContent = entry.id;
                row.insertCell(2).textContent = entry.score;
                row.insertCell(3).textContent = entry.raw_score;
                
                rank += 1;
                row.classList.add('animate__fadeIn', 'animate__animated');
            }
        });

        if (!currentUserDisplayed) {
            const currentUserEntry = data.find(entry => (entry.client_id).split('.')[1] === currentUserId);
            rank = data.findIndex(entry => (entry.client_id).split('.')[1] === currentUserId);
            
            if (currentUserEntry !== undefined) {
                const row = leaderboardBody.insertRow();
                row.insertCell(0).textContent = rank;
                row.insertCell(1).textContent = currentUserEntry.id;
                row.insertCell(2).textContent = currentUserEntry.score;
                row.insertCell(3).textContent = currentUserEntry.raw_score;
                row.classList.add('current-user', 'animate__animated', 'animate__fadeIn');
            }
        }
      }
  
    /**
     * Sort leaderboard data by a given property by fetching the sorted leaderboard data.
     * @param {string} property - The property to sort by.
     * @param {string} interval - The interval for the db you're interested in: All-Time and Daily (at the moment)
     * @param {string} currentUserId - The current user's ID.
     */
    function sortLeaderboard(property, interval, currentUserId) {
        fetch(`${api_url_root}/leaderboard?sortBy=${property}&interval=${interval}`)
            .then(response => response.json())
            .then(data => populateLeaderboard(data, currentUserId))
            .catch(error => console.error('Error sorting leaderboard:', error));
    }
  
    /**
     * Get User ID from JWT Token
     */
    function getCurrentUserIdFromToken() {
        const googleIdToken = window.localStorage.getItem("google_id_token");
        if (googleIdToken) {
            const decodedToken = jwt_decode(googleIdToken);
            return decodedToken.sub; // or the appropriate claim that represents the user's ID
        }
        return null;
    }

    // Event listener for the alltime leaderboard
    document.getElementById('selectAlltime').addEventListener('click', () => {
        const currentUserId = getCurrentUserIdFromToken();
        intervalVal = 'alltime';
        sortLeaderboard('score', intervalVal, currentUserId);
    });

    // Event listener for the selected season's leaderboard
    document.getElementById('seasonSelector').addEventListener('change', function () {
        const currentUserId = getCurrentUserIdFromToken();
        intervalVal = this.value; // The selected item (season)
        sortLeaderboard('score', intervalVal, currentUserId);
    });
  
    // Event listeners for sort buttons
    document.getElementById('sortByScore').addEventListener('click', () => {
        const currentUserId = getCurrentUserIdFromToken();
        sortLeaderboard('score', intervalVal, currentUserId);
    });
    document.getElementById('sortByRawScore').addEventListener('click', () => {
        const currentUserId = getCurrentUserIdFromToken();
        sortLeaderboard('raw_score', intervalVal, currentUserId);
    });
  
    // Initial fetch of leaderboard data
    function init() {
        populateCheckSeasons();
        const currentUserId = getCurrentUserIdFromToken(); // Get the current user ID from the token
        fetchLeaderboard(currentUserId);
    }
  
    init();
  
  })();  