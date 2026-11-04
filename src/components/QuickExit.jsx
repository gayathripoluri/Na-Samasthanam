import { useEffect, useRef } from 'react';
import { QUICK_EXIT_URL } from '../data/content.js';
import { UiIcon } from './icons.jsx';

// Two Escape presses this close together count as a quick exit.
const DOUBLE_ESCAPE_MS = 800;

function exit() {
  // Hide the page at once so nothing lingers on screen while the next one loads.
  document.documentElement.style.visibility = 'hidden';
  // replace() swaps out this history entry, so Back doesn't return here.
  window.location.replace(QUICK_EXIT_URL);
}

export default function QuickExit() {
  const lastEscapeRef = useRef(0);

  useEffect(() => {
    // Modals stop their own Escape from reaching here, so the first press
    // inside one only closes it.
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const now = Date.now();
      if (now - lastEscapeRef.current < DOUBLE_ESCAPE_MS) exit();
      else lastEscapeRef.current = now;
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <button
      aria-label="Quick exit: leave this site now. Or press Escape twice."
      className="quick-exit"
      onClick={exit}
      type="button"
    >
      <UiIcon name="close" size={16} />
      <span>Quick exit</span>
    </button>
  );
}
