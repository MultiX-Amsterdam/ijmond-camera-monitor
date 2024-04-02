(function () {
    "use strict";
  
    var util = new edaplotjs.Util();
    var api_url_root = util.getRootApiUrl();
  
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
     * Populate leaderboard table with data.
     * @param {Array} data - The leaderboard data.
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
                    const contextClass = isCurrentUser ? 'table-success' : ''; // If it's not in top-three, use a table success class
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
            
            if (currentUserEntry) {
                const row = leaderboardBody.insertRow();
                row.classList.add('current-user', 'animate__animated', 'animate__fadeIn');
                row.insertCell(0).textContent = rank;
                row.insertCell(1).textContent = entry.id;
                row.insertCell(2).textContent = entry.score;
                row.insertCell(3).textContent = entry.raw_score;
            }
        }
      }
  
    /**
     * Sort leaderboard data by a given property by fetching the sorted leaderboard data.
     * @param {string} property - The property to sort by.
     * @param {string} currentUserId - The current user's ID.
     */
    function sortLeaderboard(property, currentUserId) {
        fetch(`${api_url_root}/leaderboard?sortBy=${property}`)
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
            console.log(decodedToken)
            return decodedToken.sub; // or the appropriate claim that represents the user's ID
        }
        return null;
    }
  
    // Event listeners for sort buttons
    document.getElementById('sortByScore').addEventListener('click', () => {
        const currentUserId = getCurrentUserIdFromToken();
        sortLeaderboard('score', currentUserId);
    });
    document.getElementById('sortByRawScore').addEventListener('click', () => {
        const currentUserId = getCurrentUserIdFromToken();
        sortLeaderboard('raw_score', currentUserId);
    });
  
    // Initial fetch of leaderboard data
    function init() {
        const currentUserId = getCurrentUserIdFromToken(); // Get the current user ID from the token
        fetchLeaderboard(currentUserId);
    }
  
    init();
  
  })();  