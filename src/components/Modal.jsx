import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog with a dimmed backdrop. Escape or a backdrop click closes it, Tab
// stays inside it, and focus returns to whatever opened it.
export default function Modal({ className, labelledBy, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    return () => opener?.focus?.();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      // Keep this press from counting toward the Quick exit double-Escape.
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop" onKeyDown={handleKeyDown} onMouseDown={onClose}>
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={className}
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        {children}
      </section>
    </div>
  );
}
