// MCP Resources Loader
// Reads markdown files from resources directory and exposes them as MCP resources

const fs = require('fs');
const path = require('path');

/**
 * Loads markdown files from resources directory
 * Extracts resource names from file headlines (# Headline)
 *
 * @param {string} resourcesDir - Path to resources directory
 * @param {object} logger - Logger instance
 * @returns {object} Resources mapping: { name -> { uri, content, description } }
 */
function loadResources(resourcesDir, logger) {
  const resources = {};

  try {
    if (!fs.existsSync(resourcesDir)) {
      logger.warn(`Resources directory not found: ${resourcesDir}`);
      return resources;
    }

    const files = fs.readdirSync(resourcesDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    logger.info(`📚 Found ${mdFiles.length} markdown resource files`);

    mdFiles.forEach(file => {
      try {
        const filePath = path.join(resourcesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract headline from first line if it starts with #
        let resourceName = null;
        let description = file;
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#')) {
            // Remove # and spaces to get the headline
            resourceName = trimmed.replace(/^#+\s+/, '').trim();
            description = resourceName;
            break;
          }
        }

        // Fall back to filename if no headline found
        if (!resourceName) {
          resourceName = file.replace('.md', '');
        }

        // Create URI from filename (without .md extension)
        const uri = `resource://${file.replace('.md', '')}`;

        resources[resourceName] = {
          uri: uri,
          name: resourceName,
          description: description,
          mimeType: 'text/markdown',
          content: content,
          filename: file
        };

        logger.debug(`✅ Loaded resource: "${resourceName}" from ${file}`);
      } catch (error) {
        logger.error(`❌ Failed to load resource from ${file}:`, error.message);
      }
    });

    logger.info(`✨ Successfully loaded ${Object.keys(resources).length} resources`);
    return resources;
  } catch (error) {
    logger.error('Failed to load resources:', error);
    return {};
  }
}

/**
 * Gets list of resources for MCP resources/list handler
 *
 * @param {object} resources - Resources map from loadResources()
 * @returns {array} Array of resource objects for MCP
 */
function getResourcesList(resources) {
  return Object.values(resources).map(resource => ({
    uri: resource.uri,
    name: resource.name,
    description: resource.description,
    mimeType: resource.mimeType
  }));
}

/**
 * Gets resource content for MCP resources/read handler
 *
 * @param {object} resources - Resources map from loadResources()
 * @param {string} resourceUri - Resource URI to read
 * @returns {string|null} Resource content or null if not found
 */
function getResourceContent(resources, resourceUri) {
  // Find resource by URI
  const resource = Object.values(resources).find(r => r.uri === resourceUri);

  if (!resource) {
    return null;
  }

  return resource.content;
}

module.exports = {
  loadResources,
  getResourcesList,
  getResourceContent
};
