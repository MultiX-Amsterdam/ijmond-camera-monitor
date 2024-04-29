(function () {
  "use strict";

  /**
   * Changes the language of the app after choosing a language, and stores it in localstorage for the choice to be saved
   * @param {string} lng The chosen language in string (so far english and greek supported)
   */
  function changeLanguage(lng) {
    window.i18n.changeLanguage(lng, () => {
      window.localStorage.setItem('selectedLanguage', lng);
      window.updateContent();
      location.reload();
    });
  }
  
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

      document.getElementById('lang-en').addEventListener('click', () => changeLanguage('en'));
      document.getElementById('lang-gr').addEventListener('click', () => changeLanguage('gr'));
    });
  });

})();