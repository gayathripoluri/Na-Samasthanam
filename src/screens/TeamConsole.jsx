import { useCallback, useEffect, useState } from 'react';
import Helplines from '../components/Helplines.jsx';
import { friendlyError, supabase } from '../lib/supabase.js';
import { timeAgo } from '../lib/timeAgo.js';
import { MemberView, Members, Overview } from './AdminViews.jsx';

const REFRESH_EVERY = 15000;

const sourceLabel = {
  member: 'Flagged by a member',
  needs_support: 'Needs Support post',
};

function FlagCard({ flag, onDone }) {
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const draftId = `team-reply-${flag.id}`;

  const run = async (change, after) => {
    setBusy(true);
    const { error: failure } = await change;
    setBusy(false);
    if (failure) {
      setError(friendlyError(failure));
      return;
    }
    setError('');
    after();
  };

  const sendReply = (event) => {
    event.preventDefault();
    const body = reply.trim();
    if (!body) return;
    run(
      supabase.from('comments').insert({ post_id: flag.post_id, body, as_team: true }),
      () => setReply(''),
    );
  };

  return (
    <article className="flag-card">
      <p className="flag-card__meta">
        {sourceLabel[flag.source]} · {flag.post_author} · {timeAgo(flag.created_at)}
      </p>
      <p>{flag.post_text}</p>
      {flag.post_id ? (
        <form className="team-reply" onSubmit={sendReply}>
          <label className="visually-hidden" htmlFor={draftId}>
            Reply as the team
          </label>
          <textarea
            id={draftId}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Reply on her post, with the Team badge…"
            rows={3}
            value={reply}
          />
          <button className="request-decline" disabled={busy || !reply.trim()} type="submit">
            Send reply
          </button>
        </form>
      ) : (
        <p className="flag-card__meta">She has deleted this post, so it can&apos;t be replied to.</p>
      )}
      {error && <p className="circle-error" role="alert">{error}</p>}
      <button
        className="request-accept"
        disabled={busy}
        onClick={() =>
          run(supabase.from('flags').update({ status: 'followed_up' }).eq('id', flag.id), onDone)
        }
        type="button"
      >
        Mark as followed up
      </button>
    </article>
  );
}

function Queue() {
  const [flags, setFlags] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const { data, error: failure } = await supabase
      .from('flags')
      .select('*')
      .eq('status', 'open')
      .order('created_at');
    if (failure) setError(friendlyError(failure));
    else {
      setFlags(data);
      setError('');
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_EVERY);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <section className="team-queue" aria-label="Flagged for follow-up">
      <p className="portal-note">
        {flags ? `${flags.length} waiting · oldest first` : 'Loading…'}
      </p>
      {error && <p className="circle-error" role="alert">{error}</p>}
      <Helplines intro="If someone may be in danger, use these lines. Don't wait." />
      {flags?.length === 0 && <p className="empty-note">No one is waiting right now.</p>}
      {flags?.map((flag) => (
        <FlagCard flag={flag} key={flag.id} onDone={refresh} />
      ))}
    </section>
  );
}

const TABS = [
  { id: 'queue', label: 'Follow-up', view: Queue },
  { id: 'member', label: 'Member view', view: MemberView },
  { id: 'members', label: 'Members', view: Members, adminOnly: true },
  { id: 'overview', label: 'Overview', view: Overview, adminOnly: true },
];

function Portal({ role, onSignOut }) {
  const [tabId, setTabId] = useState('queue');
  const tabs = TABS.filter((tab) => !tab.adminOnly || role === 'admin');
  const { view: View } = tabs.find((tab) => tab.id === tabId);

  return (
    <div className="portal">
      <header className="portal-header">
        <h1>Team portal</h1>
        <span className="portal-role">{role === 'admin' ? 'Admin' : 'Team'}</span>
      </header>
      <nav className="portal-tabs" aria-label="Portal sections">
        {tabs.map((tab) => (
          <button
            aria-current={tab.id === tabId ? 'page' : undefined}
            className={tab.id === tabId ? 'is-active' : ''}
            key={tab.id}
            onClick={() => setTabId(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
        <button className="portal-signout" onClick={onSignOut} type="button">
          Sign out
        </button>
      </nav>
      <div className="portal-body">
        <View />
      </div>
    </div>
  );
}

// Opened at #team or #admin. The login form is public, but everything behind it
// is only served to accounts in team_members, checked in the database.
export default function TeamConsole() {
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchRole = async () => {
    const { data } = await supabase.rpc('my_team_role');
    return data ?? null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) setRole(await fetchRole());
    });
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
    const found = failure ? null : await fetchRole();
    setBusy(false);
    setPassword('');
    if (!found) {
      if (!failure) await supabase.auth.signOut({ scope: 'local' });
      setError('That login isn’t a team account.');
      return;
    }
    setRole(found);
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setRole(null);
  };

  if (role) return <Portal onSignOut={signOut} role={role} />;

  return (
    <section className="screen signature-screen" aria-labelledby="team-title">
      <div className="signature-content">
        <h1 id="team-title">Team sign in</h1>
        <form className="signature-form" onSubmit={signIn}>
          <label className="visually-hidden" htmlFor="team-email">Email</label>
          <input
            autoComplete="username"
            id="team-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            value={email}
          />
          <label className="visually-hidden" htmlFor="team-password">Password</label>
          <input
            autoComplete="current-password"
            id="team-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            value={password}
          />
          {error && <p className="alias-feedback is-error" role="alert">{error}</p>}
          <button className="primary-button seal-button" disabled={busy || !email || !password} type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </section>
  );
}
