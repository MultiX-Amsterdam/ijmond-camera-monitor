(function () {
  "use strict";

  var util = new edaplotjs.Util();

  function init() {
    var google_account_dialog = new edaplotjs.GoogleAccountDialog();
    var ga_tracker = new edaplotjs.GoogleAnalyticsTracker({
      ready: function () {
        google_account_dialog.isAuthenticatedWithGoogle();
      }
    });
  }

  $(init);
})();