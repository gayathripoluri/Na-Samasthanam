import { curseWords } from '../data/curseWords.js';

const LOOKALIKES = { '@': 'a', 4: 'a', 3: 'e', 1: 'i', '!': 'i', 0: 'o', $: 's', 5: 's', 7: 't' };
const ENDINGS = '(?:s|es|ed|er|ers|ing|in)?';
// Anything that isn't a letter or mark (in any script) separates words.
const EDGE_BEFORE = '(?:^|[^\\p{L}\\p{M}*])';
const EDGE_AFTER = '(?=$|[^\\p{L}\\p{M}*])';

const escape = (char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Drops Latin accents ("cabrón" → "cabron") without touching the vowel signs
// of Indic and other scripts, which live outside this range.
const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');

const normalize = (text) =>
  stripAccents(text.toLowerCase()).replace(/[@4310!$57]/g, (char) => LOOKALIKES[char]);

// "fuck" → f+[u*]+[c*]+[k*]+ so stretched ("fuuuck") and masked ("f**k")
// spellings still match; spaces in phrases ("nee amma") allow any run of spaces.
const letter = (char, index) => {
  if (char === ' ') return '\\s+';
  return index === 0 ? `${escape(char)}+` : `[${escape(char)}*]+`;
};

const patterns = curseWords.map((word) => ({
  word,
  regex: new RegExp(
    `${EDGE_BEFORE}(${[...normalize(word)].map(letter).join('')}${ENDINGS})${EDGE_AFTER}`,
    'iu',
  ),
}));

// Returns the words found, as written in the text (empty if clean).
export function findCurseWords(text) {
  const normalized = normalize(text);
  const found = [];
  for (const { regex } of patterns) {
    const match = normalized.match(regex);
    if (match && !found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

// "fuck" → "f**k" for showing a word back without repeating it.
export const maskWord = (word) => {
  const chars = [...word];
  return chars.length <= 2
    ? `${chars[0]}*`
    : `${chars[0]}${'*'.repeat(chars.length - 2)}${chars.at(-1)}`;
};
