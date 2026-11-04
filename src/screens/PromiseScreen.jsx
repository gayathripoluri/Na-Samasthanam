import { useEffect, useRef, useState } from 'react';
import { promises } from '../data/content.js';
import { CheckIcon, CircleMark, FingerprintIcon } from '../components/icons.jsx';

export default function PromiseScreen({ index, onPromise }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const holdStartRef = useRef(null);
  const frameRef = useRef(null);
  const finishTimeoutRef = useRef(null);
  const completedRef = useRef(false);

  const tick = () => {
    frameRef.current = null;
    if (holdStartRef.current === null) return;
    const elapsed = Date.now() - holdStartRef.current;
    const nextProgress = Math.min((elapsed / 2000) * 100, 100);
    setProgress(nextProgress);
    if (nextProgress >= 100) {
      completedRef.current = true;
      setHolding(false);
      setCompleted(true);
      holdStartRef.current = null;
      finishTimeoutRef.current = window.setTimeout(() => {
        finishTimeoutRef.current = null;
        onPromise();
      }, 900);
      return;
    }
    frameRef.current = window.requestAnimationFrame(tick);
  };

  const startHold = (event) => {
    if (completedRef.current || holdStartRef.current !== null) return;
    if (event?.pointerId !== undefined) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    holdStartRef.current = Date.now();
    setHolding(true);
    frameRef.current = window.requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (completedRef.current) return;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    holdStartRef.current = null;
    setHolding(false);
    setProgress(0);
  };

  const handleKeyDown = (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      startHold();
    }
  };

  const handleKeyUp = (event) => {
    if (event.key === ' ' || event.key === 'Enter') cancelHold();
  };

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      if (finishTimeoutRef.current !== null) {
        window.clearTimeout(finishTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <section className="screen promise-screen" aria-labelledby="promise-title">
      <header className="promise-header">
        <CircleMark lit={Math.min(index, promises.length)} />
        <p className="eyebrow">
          Promise {Math.min(index, promises.length)} of {promises.length}
        </p>
      </header>

      <h1 className="promise-quote" id="promise-title">
        &quot;{promises[Math.min(index, promises.length) - 1]}&quot;
      </h1>

      <div className="promise-action">
        <button
          aria-label={completed ? 'Promise sealed' : 'Press and hold to make this promise'}
          className={`fingerprint-button${holding ? ' is-holding' : ''}`}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPointerCancel={cancelHold}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          type="button"
        >
          <span className="fingerprint-halo" aria-hidden="true" />
          <FingerprintIcon color="#E7AA5330" />
          <span
            className={`fingerprint-fill${progress === 0 ? ' is-resetting' : ''}`}
            style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
          >
            <FingerprintIcon />
          </span>
          {completed && (
            <span className="fingerprint-check">
              <CheckIcon />
            </span>
          )}
        </button>
        <p className="eyebrow promise-instruction">
          {completed ? 'Sealed' : holding ? 'Hold...' : 'Hold to promise'}
        </p>
        <p className="promise-hint">Press and hold until the print fills</p>
      </div>
    </section>
  );
}
