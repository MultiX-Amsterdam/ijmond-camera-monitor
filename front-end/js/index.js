(function () {
  "use strict";

  var util = new edaplotjs.Util();
  var is_video_autoplay_tested = false;

  function init() {
    util.addVideoClearEvent();
    var video_test_dialog = new edaplotjs.VideoTestDialog();
    if (!is_video_autoplay_tested) {
      video_test_dialog.startVideoPlayTest(1000);
      is_video_autoplay_tested = true;
    }
    var google_account_dialog = new edaplotjs.GoogleAccountDialog();
    var ga_tracker = new edaplotjs.GoogleAnalyticsTracker({
      ready: function () {
        google_account_dialog.isAuthenticatedWithGoogle();
      }
    });
  }

  $(init);
})();