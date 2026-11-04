import { useState } from 'react';
import { MAX_STRIKES } from '../data/content.js';
import { friendlyError, supabase } from '../lib/supabase.js';

export default function SuspendedScreen() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    const { error: failure } = await supabase.rpc('submit_appeal', { p_message: message });
    setSending(false);
    if (failure) setError(friendlyError(failure));
    else setSent(true);
  };

  return (
    <section className="screen suspended-screen" aria-labelledby="suspended-title">
      <div className="breathing-copy">
        <h1 id="suspended-title">Your account has been suspended.</h1>
        <p>
          Your account has been suspended after {MAX_STRIKES} blocked comments or a team
          review. To keep this circle safe, it can no longer post or comment.
        </p>
        {sent ? (
          <p role="status">Your appeal is with the team, and they&apos;ll review it.</p>
        ) : (
          <form className="appeal-form" onSubmit={send}>
            <label htmlFor="appeal-text">
              If you think this is a mistake, tell the team what happened.
            </label>
            <textarea
              id="appeal-text"
              maxLength={2000}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              value={message}
            />
            {error && <p className="circle-error" role="alert">{error}</p>}
            <button
              className="primary-button"
              disabled={!message.trim() || sending}
              type="submit"
            >
              {sending ? 'Sending…' : 'Send appeal'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
