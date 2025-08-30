const { fetch } = require('undici');

async function fetchWithRetry(url, options = {}, {
  retries = 3,
  backoff = 500,
  maxBackoff = 4000,
} = {}) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (error.code && String(error.code).includes('TLS')) {
        console.error(`TLS error when fetching ${url} on attempt ${attempt + 1}:`, error);
        throw error;
      }
      if (attempt === retries - 1) {
        console.error(`HTTP request to ${url} failed after ${retries} attempts:`, error);
        throw error;
      }
      const delay = Math.min(backoff * (2 ** attempt), maxBackoff);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = { fetchWithRetry };
