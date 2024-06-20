(function() {
  "use strict";

  /**
   * Function to fetch and update the translation for an element
   * @param {any} element The element to be translated
   */
  function translateElement(element) {
      const key = element.getAttribute('data-i18n');
      const translation = i18next.t(key); // Fetch translation for key
      element.innerHTML = translation;
  }

  // Updates the content of all elements with the data-i18n attribute
  function updateContent() {
    if (i18next.isInitialized) { // Check if i18next is initialized
      document.querySelectorAll('[data-i18n]').forEach(translateElement);
    }
  }

  // Function to initialize i18next
  function initializeI18next(savedLanguage) {
      i18next.use(i18nextHttpBackend).init({
          lng: savedLanguage,
          fallbackLng: 'en',
          backend: {
              loadPath: '../../locales/{{lng}}.json'
          }
      }, (err) => {
        if (err) {
          console.error('i18next initialization error:', err);
        }
      });
  }

  // Event listener for when i18next is ready
  function onI18nextInitialized() {
      updateContent(); // Update content when i18next is ready
  }

  // Start the i18next setup
  function setup() {
      const savedLanguage = localStorage.getItem('selectedLanguage') || 'en';

      initializeI18next(savedLanguage); 
      i18next.on('initialized', onI18nextInitialized);

      // Making functions globally available since we need them at performance.js
      window.updateContent = updateContent;
      window.i18n = i18next;
  }

  setup();

})();
