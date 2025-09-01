function clampLen(s, n = 200) {
  if (typeof s !== 'string') return '';
  return s.substring(0, n);
}

function validStrong(s) {
  return /^[GH]\d{1,5}$/.test(s);
}

function validTrans(t) {
  const v = (t || '').toLowerCase();
  return v === 'kjv' ? 'kjv' : 'asv';
}

function validRefNums(n) {
  return Number.isInteger(n) && n >= 1 && n <= 1999;
}

module.exports = { clampLen, validStrong, validTrans, validRefNums };
