const books = [
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

function normalize(name) {
  if (!name) return '';
  const roman = { i: '1', ii: '2', iii: '3' };
  let n = name.trim().toLowerCase();
  n = n.replace(/^(i{1,3})\b/, (m) => roman[m] || m);
  n = n.replace(/[^a-z0-9]/g, '');
  return n;
}

const map = {};
books.forEach((b, i) => {
  if (!b) return;
  map[normalize(b)] = i;
});

const aliases = {
  songofsongs: 22,
  canticles: 22,
  revelations: 66,
};
for (const [k, v] of Object.entries(aliases)) {
  map[normalize(k)] = v;
}

function idToName(id) {
  return books[id] || null;
}

function nameToId(name) {
  const norm = normalize(name);
  if (map[norm]) return map[norm];
  const matches = Object.entries(map).filter(([k]) => k.startsWith(norm) || norm.startsWith(k));
  return matches.length === 1 ? matches[0][1] : null;
}

module.exports = { books, idToName, nameToId };
