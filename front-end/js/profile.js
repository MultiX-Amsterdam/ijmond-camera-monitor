(function(){
    "use strict";

    var util = new edaplotjs.Util();
    var api_url_root = util.getRootApiUrl();

    /**
     * Fetch profile data and the achievements and call the necessary function to populate the profile page.
     * @param {string} currentUserId - The current user's ID.
    */
    async function fetchProfile(currentUserId) {
        const googleId = 'google.' + currentUserId // Create the client_id by appending the google. in front of the sub
        try {
            let [userDataResponse, achievementsResponse] = await Promise.all([
                fetch(`${api_url_root}/get_user?user_id=${encodeURIComponent(googleId)}`),
                fetch(`${api_url_root}/get_all_achievements`)
            ]);

            let userData = await userDataResponse.json();
            let achievementsData = await achievementsResponse.json();

            fetchDailyScoresAndDisplayChart(currentUserId, userData);
            displayAllAchievements(achievementsData.achievements, userData.achievements);
          }
        catch(err) {
            console.log(err);
        };
    }

    /**
     * Creates the chart with X axis being the last 7 entries (days) in the DB records of the user, and Y being scores (raw and normal).
     * @param {list} labels - Contains which are the last 7 days
     * @param {list} scoreData - Contains the scores of the user
     * @param {list} rawScoreData - Contains the raw scores of the user
    */
    function createChart(labels, scoreData, rawScoreData) {
        const ctx = document.getElementById('scoreChart').getContext('2d');
        const chart = new Chart(ctx, {
            // The type of chart we want to create
            type: 'line',
    
            // Settings
            data: {
                labels: labels,
                datasets: [{
                    label: window.i18n.t('score'),
                    backgroundColor: 'rgb(255, 99, 132)',
                    borderColor: 'rgb(255, 99, 132)',
                    data: scoreData,
                    fill: false,
                }, {
                    label: window.i18n.t('raw-score'),
                    backgroundColor: 'rgb(54, 162, 235)',
                    borderColor: 'rgb(54, 162, 235)',
                    data: rawScoreData,
                    fill: false,
                }]
            },
    
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        ticks: {
                            color: "white",
                        },
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'dd/MM/yyyy',
                            displayFormats: {
                                day: 'dd/MM/yyyy'
                            },            
                            parser: 'dd/MM/yyyy'
                        },
                        ticks: {
                            color: 'white',
                            maxRotation: 90,
                            autoSkip: true,
                            maxTicksLimit: 10
                        }
                    },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: 'white'
                    }
                  }
                },

                onClick: (e) => {
                    const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
    
                    if (points.length) {
                        const firstPoint = points[0];
                        const label = chart.data.labels[firstPoint.index];
                        const value = chart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index];
                        console.log(`Clicked on label: ${label} with value: ${value}`);
                    }
                }
            }
        });
    }    

    /**
     * Populate profile table with name, user score, raw score, consecutive days active, and with the achievements they earned.
     * @param {string} currentUserId - Current user's ID without the google. prefix
     * @param {any} data - User Data returning from query
    */
    function fetchDailyScoresAndDisplayChart(currentUserId, data) {

        $("#user-score").text(data.score);
        $("#user-raw-score").text(data.raw_score);
        
        fetch(`${api_url_root}/get_season_scores?user_id=${encodeURIComponent(currentUserId)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.season_scores) {
                    const labels = []; // for dates
                    const scoreData = []; // for scores
                    const rawScoreData = []; // for raw scores
                    data.season_scores.forEach(day => {
                        labels.push(new Date(day.date));
                        scoreData.push(day.score);
                        rawScoreData.push(day.raw_score);
                    });

                    createChart(labels, scoreData, rawScoreData);
                }
            })
            .catch(error => console.error('Error fetching daily scores:', error));
        
        $('#loading-overlay').hide(); // Hide the loading
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
     * Create the Achievements table
     * @param {any} allAchievements - Every Achievement
     * @param {any} userAchievements - User's Achievements
    */
    function displayAllAchievements(allAchievements, userAchievements) {
        let achievementsHtml = allAchievements.map((achievement,index) => {
    
            let achievementName = '';
            let description = '';
            if (achievement.name.split(' ')[0] == 'Season') {
                achievementName = window.i18n.t('achievements-list.season-champion.name', { season: achievement.name.split(' ')[1]});
                description = window.i18n.t('achievements-list.season-champion.description');
            } else if (achievement.name.split(' ')[0] == 'Tutorial') {
                if (achievement.name.split(' ')[1] == 'Finisher') {
                    achievementName = window.i18n.t('achievements-list.tutorial-finisher.name', { season: achievement.name.split(' ')[1]});
                    description = window.i18n.t('achievements-list.tutorial-finisher.description');
                } else {
                    achievementName = window.i18n.t('achievements-list.tutorial-pro.name', { season: achievement.name.split(' ')[1]});
                    description = window.i18n.t('achievements-list.tutorial-pro.description');
                }
            } else if (achievement.name.split(' ')[0] == 'Quiz') {
                if (achievement.name.split(' ')[1] == 'Finisher') {
                    achievementName = window.i18n.t('achievements-list.quiz-finisher.name', { season: achievement.name.split(' ')[1]});
                    description = window.i18n.t('achievements-list.quiz-finisher.description');
                } else {
                    achievementName = window.i18n.t('achievements-list.quiz-pro.name', { season: achievement.name.split(' ')[1]});
                    description = window.i18n.t('achievements-list.quiz-pro.description');
                }
            }

            let userAchievement = userAchievements.find(ua => ua.name === achievement.name); // find if the achievement has been earned by the user
            let achievementClass = userAchievement ? "unlocked" : "locked";
            let icon = userAchievement ? "<i class='achievement-icon fas fa-check'></i>" : "<i class='achievement-icon fas fa-lock'></i>";
            let timesReceived = userAchievement ? `X ${userAchievement.times_received}` : "";
    
            if (userAchievement) {
                return `
                    <div class="achievement ${achievementClass}">
                        <button class="btn text-white" data-toggle="modal" data-target="#achievementModal${index}">
                            ${icon} ${achievementName} ${timesReceived}
                            <span class="achievement-description">${description}</span>
                        </button>
                        <div class="modal fade" id="achievementModal${index}" tabindex="-1" role="dialog">
                            <div class="modal-dialog modal-dialog-centered" role="document">
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">${achievementName}</h5>
                                        <button type="button" class="close" data-dismiss="modal">
                                            <span aria-hidden="true">&times;</span>
                                        </button>
                                    </div>
                                    <div class="modal-body">
                                        <p>${window.i18n.t('dates-received', { dates: userAchievement.dates_received.join(', ')})}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            } else {
                return `
                    <div class="achievement ${achievementClass}">
                        ${icon} ${achievementName} ${timesReceived}
                        <span class="achievement-description">${description}</span>
                    </div>`;
            }
        }).join('');

        $("#achievements").html(achievementsHtml);
    }        

    // Fetch of user data
    function init() {
        $('#loading-overlay').css('display', 'flex'); // Show loading
        const currentUserId = getCurrentUserIdFromToken(); // Get the current user ID from the token
        fetchProfile(currentUserId);
    }
    
    init();

})();
