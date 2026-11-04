import { useEffect, useState } from 'react';

const PREFIX = 'naa-samasthanam:';

// useState that survives a refresh by mirroring the value into localStorage.
// Default values are not written, so a fresh or signed-out device holds
// nothing that points back to this site.
export function usePersistentState(key, initial) {
  const storageKey = PREFIX + key;
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  const serialized = JSON.stringify(value);
  const isDefault = serialized === JSON.stringify(initial);

  useEffect(() => {
    try {
      if (isDefault) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, serialized);
    } catch {
      // Storage can be blocked (private mode, site settings); state still works.
    }
  }, [storageKey, serialized, isDefault]);

  return [value, setValue];
}

// Private data older versions kept on the device, before the server held it.
const LEGACY_KEYS = [
  'alias',
  'strikes',
  'savedAffirmations',
  'circlePosts',
  'supportPosts',
  'suggestSupport',
  'messagePrivacy',
];

export function clearLegacyState() {
  try {
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(PREFIX + key));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

// Removes everything this app saved, except the keys listed in `keep`.
export function clearPersistentState({ keep = [] } = {}) {
  const kept = keep.map((key) => PREFIX + key);
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX) && !kept.includes(key))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
