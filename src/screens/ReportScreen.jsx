import { useState } from 'react';
import { UiIcon } from '../components/icons.jsx';
import { TEAM_EMAIL } from '../data/content.js';
import { fillTemplate, reportReasons } from '../data/reportReasons.js';

export default function ReportScreen({ comment, post, reporter, onBack }) {
  const [reasonId, setReasonId] = useState(null);
  const [opened, setOpened] = useState(false);
  const reason = reportReasons.find((item) => item.id === reasonId);
  const username = comment.author;

  const values = { username, comment: comment.text, post: post.text, reporter };
  const subject = reason ? fillTemplate(reason.subject, values) : '';
  const body = reason ? fillTemplate(reason.body, values) : '';
  const mailto = `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

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

          <fieldset className="report-reasons">
            <legend className="section-label">Why are you reporting {username}?</legend>
            {reportReasons.map((item) => (
              <label
                className={`report-reason${reasonId === item.id ? ' is-selected' : ''}`}
                key={item.id}
              >
                <input
                  checked={reasonId === item.id}
                  name="report-reason"
                  onChange={() => {
                    setReasonId(item.id);
                    setOpened(false);
                  }}
                  type="radio"
                  value={item.id}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>

          {reason && (
            <section className="report-preview" aria-labelledby="report-preview-title">
              <h2 className="section-label" id="report-preview-title">
                Email to the team
              </h2>
              <dl>
                <dt>To</dt>
                <dd>{TEAM_EMAIL}</dd>
                <dt>Subject</dt>
                <dd>{subject}</dd>
              </dl>
              <pre>{body}</pre>
              <a className="primary-button report-send" href={mailto} onClick={() => setOpened(true)}>
                <UiIcon name="mail" size={18} />
                Email the team
              </a>
              {opened && (
                <p className="report-status" role="status">
                  Your mail app should open with this email ready — press send to
                  finish. The team will check the comment and can suspend{' '}
                  {username}&apos;s account.
                </p>
              )}
            </section>
          )}

          <p className="report-note">
            {username} won&apos;t be told who reported them. The email is sent from
            your own mail app, so on a shared device you may want to delete it from
            your Sent folder afterwards.
          </p>
        </section>
      </div>
    </div>
  );
}
