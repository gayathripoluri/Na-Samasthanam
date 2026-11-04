import { TEAM_NAME } from '../data/content.js';
import { findCurseWords } from './moderation.js';

export const ALIAS_MIN = 6;
export const ALIAS_MAX = 20;

// Names nobody can take, so no one can pass as staff.
const reserved = [TEAM_NAME, 'team', 'admin', 'moderator', 'naa_samasthanam', 'support'];

const key = (alias) => alias.trim().toLowerCase();

// The checklist shown under the alias field. Letters can be in any script.
export function aliasRules(alias) {
  return [
    { label: `${ALIAS_MIN}–${ALIAS_MAX} characters`, met: alias.length >= ALIAS_MIN && alias.length <= ALIAS_MAX },
    { label: 'a letter', met: /\p{L}/u.test(alias) },
    { label: 'a number', met: /\p{N}/u.test(alias) },
    { label: 'an underscore _', met: alias.includes('_') },
    { label: 'no spaces', met: alias.length > 0 && !/\s/.test(alias) },
  ];
}

// Problems the checklist can't show: spaces, banned words, symbols and reserved
// names. '' if none. Whether it's taken is checked by the server on sealing.
export function aliasNameProblem(alias) {
  if (/\s/.test(alias)) return 'Spaces aren’t allowed — use _ instead.';
  if (findCurseWords(alias.replace(/_/g, ' ')).length) {
    return 'That alias has words that aren’t allowed here.';
  }
  if (!/^[\p{L}\p{M}\p{N}_]+$/u.test(alias)) return 'Use only letters, numbers and _.';
  if (reserved.some((word) => key(word) === key(alias))) return 'That name is reserved.';
  return '';
}

// Returns why an alias can't be used, or '' if it's fine.
export function aliasProblem(alias) {
  const nameProblem = aliasNameProblem(alias);
  if (nameProblem) return nameProblem;
  if (alias.length < ALIAS_MIN) return `Use at least ${ALIAS_MIN} characters.`;
  if (alias.length > ALIAS_MAX) return `Keep it to ${ALIAS_MAX} characters or fewer.`;
  const unmet = aliasRules(alias).filter((rule) => !rule.met);
  if (unmet.length) return `Still needs ${unmet.map((rule) => rule.label).join(' and ')}.`;
  return '';
}
