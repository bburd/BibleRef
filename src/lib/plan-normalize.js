const { toReading } = require('./parseRef');
const { idToName } = require('./books');

function normalizeReading(input) {
  if (!input) return null;
  if (typeof input === 'string') {
    return toReading(input);
  }
  if (typeof input === 'object') {
    const { ref, book, ranges, chapter, verses, ...meta } = input;
    const spec = ref !== undefined ? ref : { book, ranges, chapter, verses };
    const reading = toReading(spec);
    if (!reading) return null;
    return { ...reading, ...meta };
  }
  return null;
}

function normalizeDay(day) {
  if (day === undefined || day === null) return { readings: [] };
  if (typeof day === 'string') {
    return { readings: [normalizeReading(day)] };
  }
  if (Array.isArray(day)) {
    return { readings: day.map(normalizeReading) };
  }
  if (typeof day === 'object') {
    if ('readings' in day || '_meta' in day) {
      const { readings = [], _meta } = day;
      const norm = { readings: readings.map(normalizeReading) };
      if (_meta !== undefined) norm._meta = _meta;
      return norm;
    }
    return { readings: [normalizeReading(day)] };
  }
  return { readings: [] };
}

function normalizeDays(days) {
  if (!Array.isArray(days)) return [];
  return days.map(normalizeDay);
}

function formatReading(reading) {
  if (!reading) return '';
  const bookName = idToName(reading.book) || '';
  const segments = [];
  for (const r of reading.ranges || []) {
    if (r.verses && r.verses.length) {
      const verses = [];
      const vs = [...r.verses].sort((a, b) => a - b);
      let start = vs[0];
      let prev = vs[0];
      for (let i = 1; i <= vs.length; i++) {
        const v = vs[i];
        if (v === prev + 1) {
          prev = v;
          continue;
        }
        if (start === prev) verses.push(String(start));
        else verses.push(`${start}-${prev}`);
        start = v;
        prev = v;
      }
      segments.push(`${r.chapter}:${verses.join(',')}`);
    } else {
      segments.push(String(r.chapter));
    }
  }
  const ref = `${bookName} ${segments.join(';')}`.trim();
  return reading.title ? `${reading.title}: ${ref}` : ref;
}

function formatDay(day) {
  const readings = Array.isArray(day.readings) ? day.readings : [];
  return readings.map((r) => `• ${formatReading(r)}`).join('\n');
}

module.exports = { normalizeDays, formatReading, formatDay };
