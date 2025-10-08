// Custom Swagger UI initialization to detect correct server URL
// This runs in the browser and can correctly detect https:// from window.location

window.addEventListener('load', function() {
  // Wait for Swagger UI to be initialized
  setTimeout(function() {
    if (window.ui) {
      // Get the origin from the current page URL (will be https:// if loaded via HTTPS)
      const origin = window.location.origin;

      // Get existing servers from the spec (includes localhost)
      const existingServers = window.ui.specSelectors?.servers()?.toJS() || [];

      // Add the detected client URL if it's different from existing servers
      const clientUrl = { url: origin, description: 'Current server (detected)' };
      const isDuplicate = existingServers.some(s => s.url === origin);

      let servers;
      if (!isDuplicate) {
        // Add client URL first, then existing servers
        servers = [clientUrl, ...existingServers];
      } else {
        servers = existingServers;
      }

      // Update the servers list
      window.ui.setServers(servers);
    }
  }, 100);
});
