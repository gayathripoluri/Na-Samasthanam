export default function AffirmationsComplete({ savedCount, alias, onContinue }) {
  return (
    <section className="screen affirmations-complete" aria-labelledby="complete-title">
      <div className="welcome-glow" aria-hidden="true">
        <span />
      </div>
      <div className="breathing-copy">
        <h1 id="complete-title">You made space for yourself.</h1>
        <p>
          Your promise is sealed, {alias}. You saved {savedCount}{' '}
          {savedCount === 1 ? 'affirmation' : 'affirmations'} to return to.
        </p>
        <button className="primary-button member-enter" onClick={onContinue}>
          Enter the Circle
        </button>
      </div>
    </section>
  );
}
