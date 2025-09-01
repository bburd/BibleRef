const STRONGS_REGEX = /\{[GH]\s*\d{1,5}\}|\[[GH]\s*\d{1,5}\]|<\s*[GH]\s*\d{1,5}\s*>/g;

function stripStrongs(s) {
  return s ? s.replace(STRONGS_REGEX, '').replace(/\s{2,}/g, ' ').trim() : s;
}

module.exports = { STRONGS_REGEX, stripStrongs };
