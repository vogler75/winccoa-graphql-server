// Custom Swagger UI initialization to detect correct server URL
// This runs in the browser and can correctly detect https:// from window.location

window.addEventListener('load', function() {
  console.log('[Swagger Custom] Page loaded, waiting for Swagger UI...');

  // Wait for Swagger UI to be initialized
  setTimeout(function() {
    console.log('[Swagger Custom] Checking for window.ui...');

    if (window.ui) {
      console.log('[Swagger Custom] window.ui found!');

      // Get the origin from the current page URL (will be https:// if loaded via HTTPS)
      const origin = window.location.origin;
      console.log('[Swagger Custom] Detected origin:', origin);

      // Get existing servers from the spec (includes localhost)
      const existingServers = window.ui.specSelectors?.servers()?.toJS() || [];
      console.log('[Swagger Custom] Existing servers:', existingServers);

      // Add the detected client URL if it's different from existing servers
      const clientUrl = { url: origin, description: 'Current server (detected)' };
      const isDuplicate = existingServers.some(s => s.url === origin);
      console.log('[Swagger Custom] Is duplicate?', isDuplicate);

      let servers;
      if (!isDuplicate) {
        // Add client URL first, then existing servers
        servers = [clientUrl, ...existingServers];
        console.log('[Swagger Custom] Adding client URL to server list');
      } else {
        servers = existingServers;
        console.log('[Swagger Custom] Client URL already in list, using existing servers');
      }

      console.log('[Swagger Custom] Final servers list:', servers);

      // Update the servers list
      window.ui.setServers(servers);
      console.log('[Swagger Custom] Servers updated!');
    } else {
      console.log('[Swagger Custom] window.ui not found yet');
    }
  }, 100);
});
