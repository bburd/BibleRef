const { LRUCache } = require('lru-cache');

const activeTrivia = new LRUCache({
  max: 1000,
  ttl: 60 * 1000, // 1 minute
  updateAgeOnGet: true,
});

const searchSessions = new LRUCache({
  max: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: true,
});

module.exports = { activeTrivia, searchSessions };
