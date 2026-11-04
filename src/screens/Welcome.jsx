export default function Welcome({ onContinue, unlocking, unlockFailed, onStartOver }) {
  return (
    <section className="screen welcome-screen" aria-labelledby="welcome-title">
      <div className="welcome-glow" aria-hidden="true">
        <span />
      </div>
      <div className="welcome-copy">
        <h1 id="welcome-title">
          Naa
          <br />
          Samasthanam
        </h1>
        <p>
          A safe circle for women who are
          <br className="desktop-break" /> ready to speak, be believed, and
          <br className="desktop-break" /> heal together.
        </p>
        <button
          className="primary-button welcome-button"
          disabled={unlocking}
          onClick={onContinue}
        >
          {unlocking ? 'Confirm it’s you…' : 'I’m ready'}
        </button>
        {unlockFailed && (
          <div className="unlock-failed" role="alert">
            <p>We couldn&apos;t confirm it&apos;s you. Tap I&apos;m ready to try again.</p>
            <button className="text-button" onClick={onStartOver} type="button">
              Can&apos;t unlock? Start over — this erases what&apos;s saved on this device
            </button>
          </div>
        )}
      </div>
      <p className="welcome-note">
        By invitation only. What&apos;s shared here, stays here.
        <small>
          On a shared device, open this in a private window so it stays out of
          your browser history.
        </small>
      </p>
    </section>
  );
}
