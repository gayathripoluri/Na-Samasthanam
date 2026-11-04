import { useState } from 'react';
import { UiIcon } from '../components/icons.jsx';
import { reportReasons } from '../data/reportReasons.js';
import { friendlyError, supabase } from '../lib/supabase.js';

export default function ReportScreen({ comment, onBack }) {
  const [reasonId, setReasonId] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const reason = reportReasons.find((item) => item.id === reasonId);
  const username = comment.author;

  const send = async () => {
    setSending(true);
    setError('');
    const { error: failure } = await supabase.rpc('report_comment', {
      p_comment: comment.id,
      p_reason: reason.label,
      p_urgent: Boolean(reason.urgent),
    });
    setSending(false);
    if (failure) setError(friendlyError(failure));
    else setSent(true);
  };

  return (
    <div className="community-app">
      <header className="community-header">
        <div className="conversation-header">
          <button aria-label="Back" className="icon-button" onClick={onBack} type="button">
            <UiIcon name="back" />
          </button>
          <div>
            <h1>Report a comment</h1>
            <p>Only the Naa Samasthanam team sees this</p>
          </div>
        </div>
      </header>

      <div className="community-scroll">
        <section className="report-content" aria-label={`Report ${username}`}>
          <figure className="report-quote">
            <figcaption>{username} wrote:</figcaption>
            <blockquote>{comment.text}</blockquote>
          </figure>

          <fieldset className="report-reasons" disabled={sent}>
            <legend className="section-label">Why are you reporting {username}?</legend>
            {reportReasons.map((item) => (
              <label
                className={`report-reason${reasonId === item.id ? ' is-selected' : ''}`}
                key={item.id}
              >
                <input
                  checked={reasonId === item.id}
                  name="report-reason"
                  onChange={() => setReasonId(item.id)}
                  type="radio"
                  value={item.id}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>

          {error && <p className="circle-error" role="alert">{error}</p>}

          {sent ? (
            <p className="report-status" role="status">
              Your report is with the team. They&apos;ll review the comment and can
              suspend {username}&apos;s account.
            </p>
          ) : (
            <button
              className="primary-button report-send"
              disabled={!reason || sending}
              onClick={send}
              type="button"
            >
              {sending ? 'Sending…' : 'Send to the team'}
            </button>
          )}

          <p className="report-note">
            {username} won&apos;t be told who reported them. Your report stays inside
            the circle, so nothing is sent from your own email.
          </p>
        </section>
      </div>
    </div>
  );
}
