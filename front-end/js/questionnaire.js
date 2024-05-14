(function () {
    "use-strict";

    var user_token = '';
    let qualtricsURL = 'https://uva.fra1.qualtrics.com/jfe/form/SV_0j2xBzGiwzI5rjE?user_id=';

    function doSurvey(user_token) {
        let finalURL = qualtricsURL + user_token;
        window.location.href = finalURL;
    }

    function init() {
        let google_account_dialog = new edaplotjs.GoogleAccountDialog({
            no_ui: true
        });
        let ga_tracker = new edaplotjs.GoogleAnalyticsTracker({
            ready: function (ga_obj) {
                user_token = ga_obj.getClientId();
                google_account_dialog.silentSignInWithGoogle({
                    success: function (is_signed_in, google_id_token) {
                        if(is_signed_in) {
                            user_token = 'google.'+jwt_decode(google_id_token).sub;
                        }
                    }
                });
                document.getElementById('questionnaireLink').onclick = function() {
                    doSurvey(user_token);
                };
            }
        });
    }

    init();

})();