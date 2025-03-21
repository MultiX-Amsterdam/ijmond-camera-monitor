(function () {
  "use strict";
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var GoogleAccountDialog = function (settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var util = new edaplotjs.Util();
    settings = safeGet(settings, {});
    var $account_dialog;
    var $sign_in_prompt;
    var $google_sign_out_button;
    var $google_sign_in_button;
    var $guest_button;
    var $sign_in_text;
    var $hello_text;
    var widgets = new edaplotjs.Widgets();
    var sign_in_success = settings["sign_in_success"];
    var sign_out_success = settings["sign_out_success"];
    var no_ui = safeGet(settings["no_ui"], false);

    // Client ID and API key from the Developer Console
    var CLIENT_ID = "524109318088-1gqhh8qeg09mss91qvbhfuuv6jc7s0tn.apps.googleusercontent.com";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      if (no_ui) {
        return;
      }
      $.get("GoogleAccountDialog.html", function (data) {
        $(document.body).append(data);
        $account_dialog = widgets.createCustomDialog({
          selector: "#account-dialog",
          show_cancel_btn: false,
          width: 270
        });
        $(document.body).on("click", "#sign-in-prompt", function () {
          $account_dialog.dialog("open");
        });
        initGoogleSignIn();
      });
    }

    function initGoogleSignIn() {
      $sign_in_prompt = $("#sign-in-prompt");
      $sign_in_text = $("#sign-in-text");
      $hello_text = $("#hello-text");
      $google_sign_out_button = $("#google-sign-out-button");
      $google_sign_in_button = $("#google-sign-in-button");
      $guest_button = $("#guest-button");
      $google_sign_out_button.on("click", function () {
        googleSignOut();
      });
      $guest_button.on("click", function () {
        $account_dialog.dialog("close");
      });
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        auto_select: true,
        callback: handleCredentialResponse
      });
      renderGoogleSignInButton();
      setInitialUI();
    }

    function handleCredentialResponse(googleUser) {
      // This function is only called when users click the sign-in button to sign in.
      var google_id_token = googleUser["credential"];
      window.localStorage.setItem("google_id_token", google_id_token);
      signInUpdateUI();
      if (typeof sign_in_success === "function") {
        sign_in_success(google_id_token);
      }
    }

    function googleSignOut() {
      // This function is only called when users click the sign-out button to sign out.
      window.localStorage.removeItem("google_id_token");
      // If something was stored in the "user_data" field, it will be removed.
      // This is designed for storing anonymous user data across pages.
      window.localStorage.removeItem("user_data");
      signOutUpdateUI();
      if (typeof sign_out_success === "function") {
        sign_out_success();
      }
    }

    function signOutUpdateUI() {
      $google_sign_out_button.hide();
      $google_sign_in_button.show();
      $guest_button.show();
      $sign_in_text.show();
      $hello_text.hide();
      var $content = $google_sign_in_button.find(".abcRioButtonContents");
      var $hidden = $content.find(":hidden");
      var $visible = $content.find(":visible");
      $hidden.show();
      $visible.hide();
      if (typeof $sign_in_prompt !== "undefined") {
        $sign_in_prompt.find("span").text("Inloggen");
        if (!$sign_in_prompt.hasClass("pulse-white")) {
          $sign_in_prompt.addClass("pulse-white")
        }
      }
    }

    function renderGoogleSignInButton() {
      google.accounts.id.renderButton(document.getElementById("google-sign-in-button"), {
        theme: "filled_blue",
        width: 211,
        size: "large"
      })
    }

    function signInUpdateUI() {
      if (typeof $guest_button !== "undefined") {
        $guest_button.hide();
      }
      if (typeof $google_sign_out_button !== "undefined") {
        $google_sign_out_button.show();
      }
      if (typeof $hello_text !== "undefined") {
        $hello_text.show();
      }
      if (typeof $sign_in_text !== "undefined") {
        $sign_in_text.hide();
      }
      if (typeof $google_sign_in_button !== "undefined") {
        $google_sign_in_button.hide();
      }
      if (typeof $account_dialog !== "undefined") {
        $account_dialog.dialog("close");
      }
      if (typeof $sign_in_prompt !== "undefined") {
        $sign_in_prompt.find("span").text("Uitloggen");
        if ($sign_in_prompt.hasClass("pulse-white")) {
          $sign_in_prompt.removeClass("pulse-white")
        }
      }
    }

    function safeGet(v, default_val) {
      return util.safeGet(v, default_val);
    }

    function setInitialUI() {
      var is_signed_in = isSignedIn();
      if (is_signed_in) {
        signInUpdateUI();
      } else {
        signOutUpdateUI();
      }
    }

    function isSignedIn() {
      var google_id_token = window.localStorage.getItem("google_id_token");
      return google_id_token == null ? false : true;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Public methods
    //
    var isAuthenticatedWithGoogle = function (callback) {
      callback = safeGet(callback, {});
      var is_signed_in = isSignedIn();
      if (is_signed_in) {
        if (typeof callback["success"] === "function") {
          var google_id_token = window.localStorage.getItem("google_id_token");
          callback["success"](is_signed_in, google_id_token);
        }
      } else {
        if (typeof callback["success"] === "function") {
          callback["success"](is_signed_in);
        }
      }
    };
    this.isAuthenticatedWithGoogle = isAuthenticatedWithGoogle;

    this.getDialog = function () {
      return $account_dialog;
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor
    //
    init();
  };

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Register to window
  //
  if (window.edaplotjs) {
    window.edaplotjs.GoogleAccountDialog = GoogleAccountDialog;
  } else {
    window.edaplotjs = {};
    window.edaplotjs.GoogleAccountDialog = GoogleAccountDialog;
  }
})();
