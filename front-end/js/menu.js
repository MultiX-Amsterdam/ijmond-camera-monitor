(function () {
  "use strict";

  /**
    * If the user is logged-in, we display the Profile icon
  */
  function updateMenuForLoggedInUser() {
    let isLoggedIn = window.localStorage.getItem("google_id_token") !== null;
    if (isLoggedIn) {
      // Create the profile icon HTML and add it to the menu
      var profileIconHtml = '<a href="profile.html" id="profile-icon-link" class="menu-profile"><i class="fas fa-user-circle" aria-hidden="true"></i></a>';
      $(".menu-items").prepend(profileIconHtml);
    }
  }

  $(function () {
    // Load the menu and then update it for a logged-in user
    $(".menu-container").load("menu.html", function() {
      updateMenuForLoggedInUser();
    });
  });

})();