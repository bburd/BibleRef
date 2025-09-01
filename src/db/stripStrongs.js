const STRONGS_REGEX = /\{[GH]\s*\d{1,5}\}|\[[GH]\s*\d{1,5}\]|<\s*[GH]\s*\d{1,5}\s*>/g;

function stripStrongs(text = '') {
  if (!text) return text;
  return text.replace(STRONGS_REGEX, '').replace(/\s+/g, ' ').trim();
}

module.exports = { STRONGS_REGEX, stripStrongs };
