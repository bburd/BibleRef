const RESERVED = ['AND', 'OR', 'NOT', 'NEAR'];
const SYNTAX_RE = /["*:^~]/;

function quoteToken(token) {
  if (!token) return '';
  const needsQuote = SYNTAX_RE.test(token) || RESERVED.includes(token.toUpperCase());
  if (!needsQuote) return token;
  return '"' + token.replace(/"/g, '""') + '"';
}

function ftsSafeQuery(query = '') {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(quoteToken)
    .join(' ');
}

module.exports = { ftsSafeQuery };
