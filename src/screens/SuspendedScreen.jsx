import { MAX_STRIKES, TEAM_EMAIL } from '../data/content.js';

export default function SuspendedScreen() {
  const appeal = `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent('Suspended account appeal')}`;

  return (
    <section className="screen suspended-screen" aria-labelledby="suspended-title">
      <div className="breathing-copy">
        <h1 id="suspended-title">Your account has been suspended.</h1>
        <p>
          Comments with curse words were blocked {MAX_STRIKES} times. To keep this
          circle safe, this account can no longer post or comment.
        </p>
        <p>
          If you think this is a mistake, write to the team at{' '}
          <a href={appeal}>{TEAM_EMAIL}</a> and we&apos;ll review it.
        </p>
      </div>
    </section>
  );
}
