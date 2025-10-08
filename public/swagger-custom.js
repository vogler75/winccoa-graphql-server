// Custom Swagger UI initialization to detect correct server URL
// This runs in the browser and can correctly detect https:// from window.location

window.addEventListener('load', function() {
  // Wait for Swagger UI to be initialized
  setTimeout(function() {
    if (window.ui) {
      // Get the origin from the current page URL (will be https:// if loaded via HTTPS)
      const origin = window.location.origin;

      // Set the server URL to the current origin
      window.ui.setServers([{ url: origin, description: 'Current server' }]);
    }
  }, 100);
});
