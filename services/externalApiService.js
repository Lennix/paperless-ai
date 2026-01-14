const axios = require('axios');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Validate URL against SSRF attacks
 * @param {string} url - The URL to validate
 * @throws {Error} If URL is not safe
 */
function validateExternalApiUrl(url) {
  // Skip validation if explicitly disabled via env
  if (process.env.DISABLE_EXTERNAL_API_URL_VALIDATION === 'yes') {
    return true;
  }

  try {
    const parsed = new URL(url);

    // Block private IP ranges (RFC 1918)
    const privateIpPatterns = [
      /^10\./,                              // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,    // 172.16.0.0/12
      /^192\.168\./,                        // 192.168.0.0/16
      /^169\.254\./,                        // Link-local (AWS metadata)
      /^127\./,                             // Loopback
      /^0\.0\.0\.0$/,                       // Special
    ];

    const hostname = parsed.hostname.toLowerCase();

    // Check for localhost variants
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      throw new Error('External API URL cannot point to localhost');
    }

    // Check private IP patterns
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        throw new Error(`External API URL cannot point to private IP range: ${hostname}`);
      }
    }

    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254') {
      throw new Error('External API URL cannot point to cloud metadata endpoint');
    }

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`External API URL must use HTTP(S), got: ${parsed.protocol}`);
    }

    return true;
  } catch (error) {
    if (error.message.includes('Invalid URL')) {
      throw new Error(`Invalid external API URL format: ${url}`);
    }
    throw error;
  }
}

/**
 * Service for fetching data from external APIs to enrich AI prompts
 */
class ExternalApiService {
  /**
   * Fetch data from the configured external API
   * @returns {Promise<Object|string|null>} The data from the API or null if disabled/error
   */
  async fetchData() {
    try {
      // Check if external API integration is enabled
      if (!config.externalApiConfig || config.externalApiConfig.enabled !== 'yes') {
        logger.debug('External API integration is disabled');
        return null;
      }

      const {
        url,
        method = 'GET',
        headers = {},
        body = {},
        timeout = 5000,
        transformationTemplate  // Renamed from transform to clarify it's a template, not executable code
      } = config.externalApiConfig;

      if (!url) {
        console.error('[ERROR] External API URL not configured');
        return null;
      }

      // SEC-001: Validate URL against SSRF attacks
      try {
        validateExternalApiUrl(url);
      } catch (ssrfError) {
        console.error('[SECURITY] External API URL validation failed:', ssrfError.message);
        return null;
      }

      console.log(`[DEBUG] Fetching data from external API: ${url}`);

      // Parse headers if they're a string
      let parsedHeaders = headers;
      if (typeof headers === 'string') {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch (error) {
          console.error('[ERROR] Failed to parse external API headers:', error.message);
          parsedHeaders = {};
        }
      }

      // Parse body if it's a string
      let parsedBody = body;
      if (typeof body === 'string' && (method === 'POST' || method === 'PUT')) {
        try {
          parsedBody = JSON.parse(body);
        } catch (error) {
          console.error('[ERROR] Failed to parse external API body:', error.message);
          parsedBody = {};
        }
      }

      // Configure request options
      const options = {
        method,
        url,
        headers: parsedHeaders,
        timeout: parseInt(timeout) || 5000,
      };

      // Add request body for POST/PUT requests
      if (method === 'POST' || method === 'PUT') {
        options.data = parsedBody;
      }

      // Make the request
      const response = await axios(options);
      let data = response.data;

      // Apply transformation template if provided (JSON path extraction, not code execution)
      // SEC-001: Removed new Function() code injection vulnerability
      // Now uses safe JSON path extraction instead
      if (transformationTemplate && typeof transformationTemplate === 'string') {
        try {
          // Support simple dot notation paths like "data.results" or "response.items[0]"
          const pathParts = transformationTemplate.split('.');
          let result = data;
          for (const part of pathParts) {
            // Handle array notation like "items[0]"
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
              result = result?.[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
            } else {
              result = result?.[part];
            }
            if (result === undefined) break;
          }
          if (result !== undefined) {
            data = result;
            logger.debug('Successfully applied transformation template to external API data');
          }
        } catch (error) {
          console.error('[ERROR] Failed to apply transformation template:', error.message);
        }
      }

      return data;
    } catch (error) {
      console.error('[ERROR] Failed to fetch data from external API:', error.message);
      if (error.response) {
        console.error('[ERROR] API Response:', error.response.status, error.response.data);
      }
      return null;
    }
  }
}

module.exports = new ExternalApiService();
