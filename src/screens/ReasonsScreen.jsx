import { reasons } from '../data/content.js';

export default function ReasonsScreen({ selected, onToggle, onContinue }) {
  return (
    <section className="screen reasons-screen" aria-labelledby="reasons-title">
      <div className="reasons-content">
        <h1 id="reasons-title">What brings you to this circle?</h1>
        <p className="reasons-subtitle">
          Choose as many as you like — or none at all.
        </p>
        <div className="reason-options" aria-label="Reasons for joining">
          {reasons.map((reason) => {
            const isSelected = selected.includes(reason);
            return (
              <button
                aria-pressed={isSelected}
                className={`reason-chip${isSelected ? ' is-selected' : ''}`}
                key={reason}
                onClick={() => onToggle(reason)}
                type="button"
              >
                {reason}
              </button>
            );
          })}
        </div>
        <p className="reasons-note">
          This helps us show you people who understand.
        </p>
      </div>
      <button className="primary-button reasons-continue" onClick={onContinue}>
        Continue
      </button>
    </section>
  );
}
