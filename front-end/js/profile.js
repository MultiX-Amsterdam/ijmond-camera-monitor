(function(){
    "use strict";

    var util = new edaplotjs.Util();
    var api_url_root = util.getRootApiUrl();

    /**
     * Fetch profile data and populate the table.
     * @param {string} currentUserId - The current user's ID.
    */
    function fetchProfile(currentUserId) {
        const googleId = 'google.' + currentUserId // Create the client_id by appending the google. in front of the sub
        fetch(`${api_url_root}/get_user?user_id=${encodeURIComponent(googleId)}`)
            .then(response => response.json())
            .then(data => populateProfile(data))
            .catch(error => console.error('Error fetching user profile data:', error));
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

    /**
     * Populate profile table with name, user score, raw score, consecutive days active, and with the achievements they earned.
     * @param {any} data - User Data returning from query
    */
    function populateProfile(data) {
        const googleIdToken = window.localStorage.getItem("google_id_token");
        if (googleIdToken) {
            const decodedToken = jwt_decode(googleIdToken);
            $(".profile-name-placeholder").text(decodedToken.given_name || "User");
            $("#user-score").text(data.score);
            $("#user-raw-score").text(data.raw_score);
            displayAchievements(data.achievements); // Call the function to display achievements
            $('#loading-overlay').hide(); // Hide the loading
        }
    }

    /**
     * Create the Achievements table
     * @param {any} achievements - User's Achievements
    */
    function displayAchievements(achievements) {
        if (Object.keys(achievements).length !== 0) {
            let achievementsHtml = achievements.map((achievement, index) => {
                return `
                    <div>
                        <button type="button" class="btn text-white font-weight-bold" data-toggle="modal" data-target="#achievementModal${index}">
                            ${achievement.name} X ${achievement.times_received} : <span class="achievement-description">${achievement.description}</span>
                        </button>
                        <!-- Modal -->
                        <div class="modal fade" id="achievementModal${index}" tabindex="-1" role="dialog" aria-labelledby="achievementModalLabel${index}" aria-hidden="true">
                            <div class="modal-dialog-centered modal-dialog-scrollable modal-dialog" role="document">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title" id="achievementModalLabel${index}">${achievement.name}</h5>
                                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                            <span aria-hidden="true">&times;</span>
                                        </button>
                                    </div>
                                    <div class="modal-body">
                                        Dates received: ${achievement.date_received.join(', ')}
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="modal-btn btn btn-secondary" data-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }).join('');
            $("#achievements").html(achievementsHtml);
        }
    }    

    // Fetch of user data
    function init() {
        $('#loading-overlay').css('display', 'flex'); // Show loading
        const currentUserId = getCurrentUserIdFromToken(); // Get the current user ID from the token
        fetchProfile(currentUserId);
    }
    
    init();

})();
