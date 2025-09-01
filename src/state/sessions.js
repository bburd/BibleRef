const LRU = require('lru-cache');

const activeTrivia = new LRU({
  max: 1000,
  ttl: 60 * 1000, // 1 minute
  updateAgeOnGet: true,
});

const searchSessions = new LRU({
  max: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: true,
});

module.exports = { activeTrivia, searchSessions };
