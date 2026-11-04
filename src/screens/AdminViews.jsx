import { useCallback, useEffect, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import { friendlyError, supabase } from '../lib/supabase.js';
import { timeAgo } from '../lib/timeAgo.js';

// What a member sees, plus the one thing only the team can do: remove a post.
// Archived posts stay hidden here too, as members were promised.
export function MemberView() {
  const [feed, setFeed] = useState('circle');
  const [posts, setPosts] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const { data, error: failure } = await supabase
      .from('posts')
      .select('*, comments(*)')
      .eq('feed', feed)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (failure) setError(friendlyError(failure));
    else setPosts(data);
  }, [feed]);

  useEffect(() => {
    setPosts(null);
    refresh();
  }, [refresh]);

  const remove = async (table, id) => {
    const { error: failure } = await supabase.from(table).delete().eq('id', id);
    if (failure) setError(friendlyError(failure));
    setRemoving(null);
    refresh();
  };

  return (
    <div className="portal-member">
      <div className="portal-toolbar">
        <div className="feed-filter" role="group" aria-label="Choose feed">
          {[
            ['circle', 'The Circle'],
            ['support', 'Needs Support'],
          ].map(([id, label]) => (
            <button
              aria-pressed={feed === id}
              className={`feed-filter__chip${feed === id ? ' is-active' : ''}`}
              key={id}
              onClick={() => setFeed(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <a className="portal-link" href="/" rel="noreferrer" target="_blank">
          Open the real member app ↗
        </a>
      </div>
      {error && <p className="circle-error" role="alert">{error}</p>}
      <div className="portal-phone">
        {posts === null && <p className="empty-note">Loading…</p>}
        {posts?.length === 0 && <p className="empty-note">No posts here yet.</p>}
        {posts?.map((post) => (
          <article className="community-post" key={post.id}>
            <div className="post-author-row">
              <Avatar initial={post.author_alias.charAt(0).toUpperCase()} />
              <div className="post-author">
                <p>{post.author_alias}</p>
                <span>
                  {timeAgo(post.created_at)}
                  {post.topic ? ` · ${post.topic}` : ''}
                  {post.edited ? ' · edited' : ''}
                </span>
              </div>
            </div>
            <p className="post-copy">{post.body}</p>
            <p className="portal-counts">
              {post.support_count} support · {post.comments.length} comments
            </p>
            {post.comments.map((comment) => (
              <div className={`post-reply${comment.as_team ? ' post-reply--team' : ''}`} key={comment.id}>
                <p>
                  <strong>
                    {comment.author_alias}
                    {comment.as_team && <em className="team-badge">Team</em>}
                  </strong>
                  <span>{timeAgo(comment.created_at)}</span>
                </p>
                <span>{comment.body}</span>
                <button
                  className="portal-remove"
                  onClick={() => setRemoving({ table: 'comments', id: comment.id })}
                  type="button"
                >
                  Remove comment
                </button>
              </div>
            ))}
            <button
              className="portal-remove"
              onClick={() => setRemoving({ table: 'posts', id: post.id })}
              type="button"
            >
              Remove post
            </button>
            {[post.id, ...post.comments.map((comment) => comment.id)].includes(removing?.id) && (
              <div className="my-post__confirm" role="alert">
                <p>Remove this for everyone? This can&apos;t be undone.</p>
                <div className="my-post__actions">
                  <button
                    className="is-danger is-solid"
                    onClick={() => remove(removing.table, removing.id)}
                    type="button"
                  >
                    Yes, remove
                  </button>
                  <button onClick={() => setRemoving(null)} type="button">
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export function Members() {
  const [members, setMembers] = useState(null);
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const { data, error: failure } = await supabase.rpc('admin_members');
    if (failure) setError(friendlyError(failure));
    else setMembers(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSuspended = async (member, suspended) => {
    const { error: failure } = await supabase.rpc('admin_set_suspended', {
      p_member: member.member_id,
      p_suspended: suspended,
    });
    if (failure) setError(friendlyError(failure));
    setConfirming(null);
    refresh();
  };

  const shown = members?.filter((member) =>
    member.member_alias.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="portal-toolbar">
        <label className="visually-hidden" htmlFor="member-search">Search aliases</label>
        <input
          className="portal-search"
          id="member-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search aliases"
          value={search}
        />
        <p className="portal-note">Reasons and messages are never shown here.</p>
      </div>
      {error && <p className="circle-error" role="alert">{error}</p>}
      {shown?.length === 0 && <p className="empty-note">No members found.</p>}
      {shown?.length > 0 && (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th scope="col">Alias</th>
                <th scope="col">Joined</th>
                <th scope="col">Posts</th>
                <th scope="col">Comments</th>
                <th scope="col">Strikes</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="visually-hidden">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((member) => (
                <tr key={member.member_id}>
                  <th scope="row">{member.member_alias}</th>
                  <td>{timeAgo(member.joined_at)}</td>
                  <td>{member.post_count}</td>
                  <td>{member.comment_count}</td>
                  <td>{member.strikes}</td>
                  <td>{member.suspended_at ? '⛔ Suspended' : '✓ Active'}</td>
                  <td className="portal-action">
                    {confirming === member.member_id ? (
                      <>
                        <button
                          className="portal-remove"
                          onClick={() => setSuspended(member, !member.suspended_at)}
                          type="button"
                        >
                          Confirm
                        </button>
                        <button className="portal-plain" onClick={() => setConfirming(null)} type="button">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="portal-plain"
                        onClick={() => setConfirming(member.member_id)}
                        type="button"
                      >
                        {member.suspended_at ? 'Lift suspension' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const waitFor = (timestamp) => {
  if (!timestamp) return 'None';
  return timeAgo(timestamp).replace(' ago', '');
};

const minutesLabel = (minutes) => {
  if (minutes === null) return 'No data yet';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
};

function Tile({ label, value, note }) {
  return (
    <div className="portal-tile">
      <p className="portal-tile__value">{value}</p>
      <p className="portal-tile__label">{label}</p>
      {note && <p className="portal-tile__note">{note}</p>}
    </div>
  );
}

export function Overview() {
  const [stats, setStats] = useState(null);
  const [latency, setLatency] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const started = performance.now();
    const { data, error: failure } = await supabase.rpc('admin_overview');
    setLatency(Math.round(performance.now() - started));
    setCheckedAt(new Date());
    if (failure) {
      setError(friendlyError(failure));
      return;
    }
    setStats(data);
    setError('');
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const host = new URL(import.meta.env.VITE_SUPABASE_URL).host;

  return (
    <div className="portal-overview">
      <div className="portal-toolbar">
        <p className="portal-note">
          {checkedAt ? `Checked ${checkedAt.toLocaleTimeString()}` : 'Checking…'}
        </p>
        <button className="portal-plain" onClick={refresh} type="button">Refresh</button>
      </div>
      {error && <p className="circle-error" role="alert">{error}</p>}
      {stats && (
        <>
          <h2 className="section-label">Care</h2>
          <div className="portal-tiles">
            <Tile label="Waiting for follow-up" value={stats.open_flags} />
            <Tile label="Longest wait" value={waitFor(stats.oldest_open_at)} />
            <Tile label="Followed up" value={stats.followed_up} />
            <Tile
              label="Average time to follow up"
              value={minutesLabel(stats.average_follow_up_minutes)}
            />
          </div>
          <h2 className="section-label">Community</h2>
          <div className="portal-tiles">
            <Tile label="Members" note={`${stats.new_this_week} new this week`} value={stats.members} />
            <Tile label="Suspended" value={stats.suspended} />
            <Tile label="Posts" note={`${stats.support_posts} in Needs Support`} value={stats.posts} />
            <Tile label="Comments" value={stats.comments} />
            <Tile label="Messages" note="Count only, never content" value={stats.messages} />
          </div>
        </>
      )}
      <h2 className="section-label">System</h2>
      <div className="portal-tiles">
        <Tile
          label="Database"
          note={latency === null ? '' : `Responded in ${latency} ms`}
          value={error ? '⚠ Problem' : '✓ Connected'}
        />
        <Tile label="Build" value={import.meta.env.MODE} />
        <Tile label="Project" note={host} value={host.split('.')[0].slice(0, 8)} />
      </div>
    </div>
  );
}
