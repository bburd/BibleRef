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

module.exports = { BOOKS, idToName, nameToId };

