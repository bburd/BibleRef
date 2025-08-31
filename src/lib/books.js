const BOOKS = [
  null,
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
];

const ALIAS = {
  // Common abbreviations for every book of the Bible
  gen: 1,
  ex: 2,
  exo: 2,
  exod: 2,
  lev: 3,
  num: 4,
  deut: 5,
  josh: 6,
  judg: 7,
  jdg: 7,
  rut: 8,
  '1sam': 9,
  '1sa': 9,
  '2sam': 10,
  '2sa': 10,
  '1kings': 11,
  '1kgs': 11,
  '1ki': 11,
  '2kings': 12,
  '2kgs': 12,
  '2ki': 12,
  '1chron': 13,
  '1chr': 13,
  '1ch': 13,
  '2chron': 14,
  '2chr': 14,
  '2ch': 14,
  ezr: 15,
  neh: 16,
  est: 17,
  esth: 17,
  job: 18,
  ps: 19,
  psa: 19,
  prov: 20,
  pro: 20,
  eccl: 21,
  ecc: 21,
  song: 22,
  sos: 22,
  cant: 22,
  isa: 23,
  jer: 24,
  lam: 25,
  ezek: 26,
  ezk: 26,
  dan: 27,
  hos: 28,
  joe: 29,
  joel: 29,
  am: 30,
  amos: 30,
  ob: 31,
  obad: 31,
  jon: 32,
  jonah: 32,
  mic: 33,
  nah: 34,
  hab: 35,
  zeph: 36,
  zep: 36,
  hag: 37,
  zech: 38,
  zec: 38,
  mal: 39,
  matt: 40,
  mt: 40,
  mark: 41,
  mk: 41,
  luke: 42,
  luk: 42,
  lk: 42,
  john: 43,
  jn: 43,
  jhn: 43,
  acts: 44,
  act: 44,
  rom: 45,
  ro: 45,
  '1cor': 46,
  '1co': 46,
  '2cor': 47,
  '2co': 47,
  gal: 48,
  eph: 49,
  phil: 50,
  php: 50,
  col: 51,
  '1thess': 52,
  '1thes': 52,
  '1th': 52,
  '2thess': 53,
  '2thes': 53,
  '2th': 53,
  '1tim': 54,
  '1ti': 54,
  '2tim': 55,
  '2ti': 55,
  tit: 56,
  phlm: 57,
  phm: 57,
  heb: 58,
  jas: 59,
  jam: 59,
  '1pet': 60,
  '1pe': 60,
  '2pet': 61,
  '2pe': 61,
  '1jn': 62,
  '2jn': 63,
  '3jn': 64,
  jude: 65,
  jud: 65,
  rev: 66,
  re: 66,
  // Legacy aliases
  songofsongs: 22,
  canticles: 22,
  revelations: 66,
};

for (let i = 1; i < BOOKS.length; i++) {
  const key = BOOKS[i].toLowerCase().replace(/[^a-z0-9]/g, '');
  ALIAS[key] = i;
}

const ROMAN = { i: '1', ii: '2', iii: '3' };

function clean(name) {
  if (!name) return '';
  let n = name.trim().toLowerCase();
  n = n.replace(/^(i{1,3})\b/, (m) => ROMAN[m] || m);
  return n.replace(/[^a-z0-9]/g, '');
}

function idToName(id) {
  return BOOKS[id] || null;
}

function nameToId(name) {
  const norm = clean(name);
  if (!norm) return null;
  if (ALIAS[norm]) return ALIAS[norm];
  const matches = Object.entries(ALIAS).filter(([k]) => k.startsWith(norm) || norm.startsWith(k));
  return matches.length === 1 ? matches[0][1] : null;
}

function searchBooks(q, limit = 25) {
  const query = (q || '').trim().toLowerCase();
  if (!query) {
    return BOOKS.slice(1, 1 + limit).map((name, idx) => ({ id: idx + 1, name }));
  }

  const results = [];
  for (let id = 1; id < BOOKS.length; id++) {
    const name = BOOKS[id];
    const norm = name.toLowerCase();
    let score;
    if (norm.startsWith(query)) score = 0;
    else if (norm.includes(query)) score = 1;
    else continue;
    results.push({ id, name, score });
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, limit).map(({ id, name }) => ({ id, name }));
}

module.exports = { BOOKS, idToName, nameToId, searchBooks };

