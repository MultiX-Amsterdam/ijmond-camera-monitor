(function () {
  "use strict";
  var util = new edaplotjs.Util();

  function handleHashChange() {
    var hash = window.location.hash;
    var q = hash.replace('#', '').split("&");
    // Remove all highlights
    var $q_all = $("a.jump").next();
    $q_all.find("span").removeClass("custom-text-info-dark-theme");
    $q_all.next().removeClass("custom-text-info-dark-theme")
    // Highlight the selected questions
    for (var i = 0; i < q.length; i++) {
      var $q = $("a[name='" + q[i] + "']").next();
      $q.find("span").addClass("custom-text-info-dark-theme");
      $q.next().addClass("custom-text-info-dark-theme");
      // Scroll to the question
      if (i == 0) {
        var p = $q.offset();
        if (typeof p !== "undefined") {
          window.scrollTo(0, p.top);
        }
      }
    }
  }

  function init() {
    var google_account_dialog = new edaplotjs.GoogleAccountDialog();
    var ga_tracker = new edaplotjs.GoogleAnalyticsTracker({
      ready: function () {
        google_account_dialog.isAuthenticatedWithGoogle();
      }
    });
    window.addEventListener("hashchange", handleHashChange, false);
    handleHashChange();
    $("#manage-consent").on("click", function () {
      var $dialog_manage_consent = util.createUserConsentManagementDialog();
      $dialog_manage_consent.dialog("open");
    });
  }
  $(init);
})();