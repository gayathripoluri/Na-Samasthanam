import { useRef, useState } from 'react';

export default function AffirmationsScreen({ affirmations, onComplete }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [saved, setSaved] = useState(() => new Set());
  const [showBreathing, setShowBreathing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef(null);
  const didSwipe = useRef(false);

  const advance = () => {
    if (cardIndex < affirmations.length - 1) {
      setCardIndex((current) => current + 1);
      setDragX(0);
      return;
    }
    setShowBreathing(true);
  };

  const toggleSave = (index) => {
    setSaved((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handlePointerDown = (event) => {
    if (event.target.closest('.save-affirmation')) return;
    dragStart.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (dragStart.current === null) return;
    setDragX(event.clientX - dragStart.current);
  };

  const handlePointerUp = () => {
    if (dragStart.current === null) return;
    const distance = dragX;
    dragStart.current = null;
    setDragging(false);
    if (Math.abs(distance) > 60) {
      didSwipe.current = true;
      advance();
    } else {
      setDragX(0);
    }
  };

  if (showBreathing) {
    return (
      <section className="screen breathing-screen" aria-labelledby="breathing-title">
        <div className="breathing-orb" aria-hidden="true">
          <span className="breathing-orb__outer" />
          <span className="breathing-orb__middle" />
          <span className="breathing-orb__inner" />
          <span className="breathing-orb__core" />
        </div>
        <div className="breathing-copy">
          <h1 id="breathing-title">Take a breath.</h1>
          <p>You made it this far.</p>
        </div>
        <button
          className="text-button breathing-continue"
          onClick={() => onComplete(affirmations.filter((_, index) => saved.has(index)))}
          type="button"
        >
          Continue
          <span aria-hidden="true"> →</span>
        </button>
      </section>
    );
  }

  return (
    <section className="screen affirmations-screen" aria-label="Affirmations">
      <p className="eyebrow affirmation-instruction">Swipe or tap to move through</p>
      <div className="affirmation-deck">
        {[2, 1].map((offset) => {
          const index = cardIndex + offset;
          if (index >= affirmations.length) return null;
          return (
            <div
              aria-hidden="true"
              className={`affirmation-card affirmation-card--back affirmation-card--${offset}`}
              key={index}
            />
          );
        })}
        <article
          className={`affirmation-card affirmation-card--front${dragging ? ' is-dragging' : ''}`}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
          }}
        >
          <button
            aria-label={`Next affirmation. ${affirmations[cardIndex]}`}
            className="affirmation-quote-button"
            onClick={() => {
              if (didSwipe.current) {
                didSwipe.current = false;
                return;
              }
              advance();
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            type="button"
          >
            <span>&ldquo;{affirmations[cardIndex]}&rdquo;</span>
          </button>
          <button
            aria-label={
              saved.has(cardIndex) ? 'Remove saved affirmation' : 'Save affirmation'
            }
            aria-pressed={saved.has(cardIndex)}
            className={`save-affirmation${saved.has(cardIndex) ? ' is-saved' : ''}`}
            onClick={() => toggleSave(cardIndex)}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </article>
      </div>
      <div className="affirmation-progress" aria-label={`Affirmation ${cardIndex + 1} of ${affirmations.length}`}>
        {affirmations.map((_, index) => (
          <span
            aria-current={index === cardIndex ? 'step' : undefined}
            className={[
              'affirmation-progress__dot',
              index < cardIndex ? 'is-past' : '',
              index === cardIndex ? 'is-current' : '',
            ].filter(Boolean).join(' ')}
            key={index}
          />
        ))}
      </div>
      <p className="affirmation-saved-count" aria-live="polite">
        {saved.size > 0
          ? `${saved.size} saved to your profile`
          : 'Tap ♥ to save ones that resonate'}
      </p>
    </section>
  );
}
